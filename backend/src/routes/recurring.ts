import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateRecurringTickets } from "../lib/recurrence";
import { authMiddleware, requireCA } from "../middleware/auth";

const router = Router();
router.use(authMiddleware, requireCA);

const scheduleSchema = z.object({
  clientId: z.string().min(1),
  templateId: z.string().min(1),
  assigneeId: z.string().optional().or(z.literal("")),
  frequency: z.enum(["WEEKLY","MONTHLY","QUARTERLY","HALF_YEARLY","YEARLY","CUSTOM"]),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dueOffsetDays: z.coerce.number().int().min(0).default(7),
});

router.get("/", async (_req, res, next) => {
  try {
    const [schedules, clients, templates, employees] = await Promise.all([
      prisma.recurringSchedule.findMany({ orderBy: { createdAt: "desc" }, include: { client: true, template: { include: { category: true } }, assignee: true } }),
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

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.recurringSchedule.update({ where: { id: req.params.id }, data: { isActive: false } });
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
