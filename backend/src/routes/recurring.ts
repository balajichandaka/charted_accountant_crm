import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateRecurringTickets, computeNextRunAt } from "../lib/recurrence";
import { authMiddleware, requireCA } from "../middleware/auth";

const router = Router();
router.use(authMiddleware, requireCA);

// Scoped includes so we never leak sensitive user fields (e.g. passwordHash).
const SCHEDULE_INCLUDE = {
  client: { select: { id: true, name: true } },
  template: { select: { id: true, name: true, category: { select: { name: true } } } },
  assignee: { select: { id: true, name: true } },
} as const;

const scheduleSchema = z.object({
  clientId: z.string().min(1),
  templateId: z.string().min(1),
  assigneeId: z.string().optional().or(z.literal("")),
  frequency: z.enum(["WEEKLY","MONTHLY","QUARTERLY","HALF_YEARLY","YEARLY","CUSTOM"]),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dueOffsetDays: z.coerce.number().int().min(0).default(7),
});

const editScheduleSchema = z.object({
  assigneeId: z.string().optional().or(z.literal("")),
  frequency: z.enum(["WEEKLY","MONTHLY","QUARTERLY","HALF_YEARLY","YEARLY","CUSTOM"]).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).nullable().optional(),
  dueOffsetDays: z.coerce.number().int().min(0).max(90).optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const [schedules, clients, templates, employees] = await Promise.all([
      prisma.recurringSchedule.findMany({ orderBy: { createdAt: "desc" }, include: SCHEDULE_INCLUDE }),
      prisma.client.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.workTemplate.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { category: true } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
    ]);
    res.json({ ok: true, data: { schedules, clients, templates, employees } });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const d = parsed.data!;
    const { nextRunAt } = await import("../lib/recurrence").then(m => ({ nextRunAt: m.computeNextRunAt(d.frequency, d.dayOfMonth) }));
    const schedule = await prisma.recurringSchedule.create({ data: { clientId: d.clientId, templateId: d.templateId, assigneeId: d.assigneeId || null, frequency: d.frequency, dayOfMonth: d.dayOfMonth ?? null, dueOffsetDays: d.dueOffsetDays, nextRunAt } });
    res.json({ ok: true, data: { id: schedule.id } });
  } catch (err) { next(err); }
});

router.patch("/:id/active", async (req, res, next) => {
  try {
    await prisma.recurringSchedule.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Full detail for the schedule mini-screen: schedule + its generated tickets + next runs.
router.get("/:id", async (req, res, next) => {
  try {
    const schedule = await prisma.recurringSchedule.findUnique({
      where: { id: req.params.id },
      include: SCHEDULE_INCLUDE,
    });
    if (!schedule) { res.status(404).json({ ok: false, error: "Schedule not found" }); return; }

    const ticketRows = await prisma.ticket.findMany({
      where: { recurringScheduleId: schedule.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, ticketNumber: true, title: true, status: true, periodLabel: true, dueDate: true, createdAt: true,
        // Auto-generated tickets carry a RECURRING_GENERATED activity; manual ones don't.
        activities: { where: { type: "RECURRING_GENERATED" }, select: { id: true }, take: 1 },
      },
    });
    const tickets = ticketRows.map(({ activities, ...t }) => ({
      ...t,
      origin: activities.length > 0 ? "AUTO" : "MANUAL",
    }));

    // Preview the next 5 run dates (first = the scheduled nextRunAt, then iterate).
    const upcomingRuns: Date[] = [];
    let cursor = schedule.nextRunAt ?? computeNextRunAt(schedule.frequency, schedule.dayOfMonth);
    for (let i = 0; i < 5; i++) {
      upcomingRuns.push(cursor);
      cursor = computeNextRunAt(schedule.frequency, schedule.dayOfMonth, cursor);
    }

    res.json({ ok: true, data: { schedule, tickets, upcomingRuns } });
  } catch (err) { next(err); }
});

// Edit an existing schedule. Recomputes nextRunAt only when timing actually changes.
router.patch("/:id", async (req, res, next) => {
  try {
    const parsed = editScheduleSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const d = parsed.data;
    const existing = await prisma.recurringSchedule.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ ok: false, error: "Schedule not found" }); return; }

    const data: { assigneeId?: string | null; dueOffsetDays?: number; frequency?: typeof existing.frequency; dayOfMonth?: number | null; nextRunAt?: Date } = {};
    if (d.assigneeId !== undefined) data.assigneeId = d.assigneeId || null;
    if (d.dueOffsetDays !== undefined) data.dueOffsetDays = d.dueOffsetDays;
    let recompute = false;
    if (d.frequency !== undefined && d.frequency !== existing.frequency) { data.frequency = d.frequency; recompute = true; }
    if (d.dayOfMonth !== undefined && d.dayOfMonth !== existing.dayOfMonth) { data.dayOfMonth = d.dayOfMonth; recompute = true; }
    if (recompute) data.nextRunAt = computeNextRunAt(data.frequency ?? existing.frequency, data.dayOfMonth ?? existing.dayOfMonth);

    await prisma.recurringSchedule.update({ where: { id: req.params.id }, data });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Permanent delete. Generated tickets are kept but unlinked from the schedule.
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.ticket.updateMany({ where: { recurringScheduleId: req.params.id }, data: { recurringScheduleId: null } }),
      prisma.recurringSchedule.delete({ where: { id: req.params.id } }),
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/run", async (_req, res, next) => {
  try {
    const result = await generateRecurringTickets();
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
});

export default router;
