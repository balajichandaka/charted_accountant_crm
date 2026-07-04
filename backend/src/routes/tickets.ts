import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  notifyTicketAssigned,
  notifyTicketParticipants,
} from "../lib/notifications";
import { authMiddleware, requireCA } from "../middleware/auth";
import { upload } from "../lib/upload";
import { computeNextRunAt, computeInitialNextRunAt } from "../lib/recurrence";
import { logger } from "../lib/logger";
import { Role, type TicketStatus, type Frequency } from "@prisma/client";

/** Fire-and-forget notification error handler (never blocks the response). */
const notifyFailed = (event: string) => (err: unknown) =>
  logger.error({ err, event }, "ticket notification failed");

// Frequencies that can drive a recurring schedule (ONE_TIME / CUSTOM cannot).
const SCHEDULABLE_FREQUENCIES: Frequency[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
const MONTH_BASED: Frequency[] = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];

const router = Router();
router.use(authMiddleware);

const BOARD_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"];

// Managers eligible to oversee a ticket: MANAGER or CA users.
const MANAGER_WHERE = { isActive: true, role: { in: [Role.MANAGER, Role.CA] } };

const ticketSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal("")),
  clientId: z.string().min(1),
  categoryId: z.string().optional().or(z.literal("")),
  templateId: z.string().optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).default("MEDIUM"),
  frequency: z.enum(["ONE_TIME","WEEKLY","MONTHLY","QUARTERLY","HALF_YEARLY","YEARLY","CUSTOM"]).default("ONE_TIME"),
  billable: z.enum(["BILLABLE","NON_BILLABLE"]).default("BILLABLE"),
  invoiceStatus: z.enum(["NOT_APPLICABLE","PENDING","ISSUED"]).default("NOT_APPLICABLE"),
  targetMinutes: z.coerce.number().int().min(0).optional(),
  documentsRequired: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  subtasks: z.array(z.object({ title: z.string().trim().min(1), order: z.number() })).default([]),
  // When true, also set up a recurring schedule from this ticket's template + frequency.
  recurring: z.boolean().optional().default(false),
});

// Full ticket include used across multiple queries
const fullInclude = {
  client: true, category: true, assignee: true, manager: true, reporter: true, template: true,
  subtasks: { orderBy: { order: "asc" as const } },
  comments: {
    include: {
      author: true,
      attachments: true,
      replies: { include: { author: true, attachments: true } },
    },
    where: { parentId: null },
    orderBy: { createdAt: "asc" as const },
  },
  timeEntries: { include: { user: true }, orderBy: { workDate: "desc" as const } },
  attachments: { include: { uploadedBy: true } },
  activities: { include: { actor: true }, orderBy: { createdAt: "desc" as const } },
};

// Non-CA users see tickets they're the assignee OR manager of.
function scopeFor(req: { user?: { role: string; sub: string } }) {
  if (req.user?.role === "CA") return {};
  return { OR: [{ assigneeId: req.user?.sub }, { managerId: req.user?.sub }] };
}

// GET /api/tickets?status=&priority=&assigneeId=&clientId=&categoryId=&search=
router.get("/", async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | string[]>;
    const { status, priority, assigneeId, clientId, categoryId, search, excludeDone, dateType, dateFrom, dateTo } = Object.fromEntries(Object.entries(q).map(([k,v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string, string | undefined>;
    const where: Record<string, unknown> = scopeFor(req);
    if (status) where.status = { in: status.split(",") };
    else if (excludeDone === "true") where.status = { notIn: ["DONE", "CANCELLED"] };
    if (priority) where.priority = { in: priority.split(",") };
    if (assigneeId) where.assigneeId = { in: assigneeId.split(",") };
    if (clientId) where.clientId = { in: clientId.split(",") };
    if (categoryId) where.categoryId = { in: categoryId.split(",") };
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (dateFrom || dateTo) {
      const field = ["startDate", "dueDate", "createdAt"].includes(dateType ?? "") ? dateType! : "createdAt";
      const range: Record<string, Date> = {};
      if (dateFrom) range.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); range.lte = d; }
      where[field] = range;
    }

    const [tickets, clients, employees, categories] = await Promise.all([
      prisma.ticket.findMany({ where, orderBy: [{ status: "asc" }, { dueDate: "asc" }], take: 200, include: { client: true, assignee: true, category: true } }),
      prisma.client.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
      prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, colorHex: true } }),
    ]);
    res.json({ ok: true, data: { tickets, clients, employees, categories } });
  } catch (err) { next(err); }
});

// GET /api/tickets/board?showDone=true
router.get("/board", async (req, res, next) => {
  try {
    const showDone = req.query.showDone === "true";
    const activeStatuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED"];
    // Done is hidden by default. When "Show Done" is on, include only tickets
    // completed in the last 7 days (not the full history).
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const statusFilter = showDone
      ? {
          OR: [
            { status: { in: activeStatuses } },
            { status: "DONE" as TicketStatus, completedAt: { gte: sevenDaysAgo } },
          ],
        }
      : { status: { in: activeStatuses } };
    // AND-wrap so this doesn't collide with the OR that scopeFor() adds for non-CA users.
    const where = { AND: [scopeFor(req), statusFilter] };
    const tickets = await prisma.ticket.findMany({ where, orderBy: [{ completedAt: "desc" }, { priority: "desc" }, { dueDate: "asc" }], take: 300, include: { client: true, assignee: true, category: true, _count: { select: { subtasks: true } } } });
    res.json({ ok: true, data: { tickets, showDone } });
  } catch (err) { next(err); }
});

// GET /api/tickets/new-form  (dropdown data for the create form)
router.get("/new-form", async (_req, res, next) => {
  try {
    const [categories, templates, clients, employees, managers] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.workTemplate.findMany({ where: { isActive: true }, include: { subtasks: { orderBy: { order: "asc" } } } }),
      prisma.client.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
      prisma.user.findMany({ where: MANAGER_WHERE, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
    ]);
    res.json({ ok: true, data: { categories, templates, clients, employees, managers } });
  } catch (err) { next(err); }
});

// GET /api/tickets/:id
router.get("/:id", async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: fullInclude });
    if (!ticket) { res.status(404).json({ ok: false, error: "Not found" }); return; }
    const [employees, managers, categories] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
      prisma.user.findMany({ where: MANAGER_WHERE, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    ]);
    res.json({ ok: true, data: { ticket, employees, managers, categories } });
  } catch (err) { next(err); }
});

// POST /api/tickets  (create with optional template snapshot)
router.post("/", async (req, res, next) => {
  try {
    const parsed = ticketSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const d = parsed.data!;
    const firmId = req.user!.firm;
    const ticket = await prisma.ticket.create({
      data: {
        firmId,
        title: d.title, description: d.description || null,
        clientId: d.clientId, categoryId: d.categoryId || null,
        templateId: d.templateId || null, assigneeId: d.assigneeId || null,
        managerId: d.managerId || null,
        reporterId: req.user!.sub, priority: d.priority, frequency: d.frequency,
        billable: d.billable, invoiceStatus: d.invoiceStatus,
        targetMinutes: d.targetMinutes ?? null,
        documentsRequired: d.documentsRequired || null,
        startDate: d.startDate ? new Date(d.startDate) : null,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        subtasks: { create: d.subtasks.map((s) => ({ firmId, title: s.title, order: s.order })) },
        activities: { create: { firmId, type: "CREATED", actorId: req.user!.sub } },
      },
    });
    // Notify assignee + manager + client that the ticket was created.
    notifyTicketParticipants(ticket.id, "CREATED").catch(notifyFailed("CREATED"));

    // Optionally set up a recurring schedule from this ticket (opt-in).
    // Needs a template and a real cadence; reuses an existing matching schedule.
    let recurringSchedule: "created" | "existing" | null = null;
    if (d.recurring && d.templateId && SCHEDULABLE_FREQUENCIES.includes(d.frequency)) {
      const existing = await prisma.recurringSchedule.findFirst({
        where: { clientId: d.clientId, templateId: d.templateId, frequency: d.frequency },
      });
      let scheduleId: string;
      if (existing) {
        scheduleId = existing.id;
        recurringSchedule = "existing";
      } else {
        const start = d.startDate ? new Date(d.startDate) : null;
        const due = d.dueDate ? new Date(d.dueDate) : null;
        const dueOffsetDays =
          start && due ? Math.min(90, Math.max(0, Math.round((due.getTime() - start.getTime()) / 86400000))) : 7;
        const dayOfMonth = MONTH_BASED.includes(d.frequency) && start ? start.getDate() : null;
        const created = await prisma.recurringSchedule.create({
          data: {
            firmId,
            clientId: d.clientId,
            templateId: d.templateId,
            assigneeId: d.assigneeId || null,
            frequency: d.frequency,
            dayOfMonth,
            dueOffsetDays,
            nextRunAt: computeInitialNextRunAt(d.frequency, dayOfMonth),
          },
        });
        scheduleId = created.id;
        recurringSchedule = "created";
      }
      // Link this manually-created ticket to the schedule so it appears under
      // "Generated tickets" (tagged Manual). periodLabel stays null so it never
      // collides with auto-generation, which starts from the next period.
      await prisma.ticket.update({ where: { id: ticket.id }, data: { recurringScheduleId: scheduleId } });
    }

    res.json({ ok: true, data: { id: ticket.id, recurringSchedule } });
  } catch (err) { next(err); }
});

// PUT /api/tickets/:id  (update fields)
router.put("/:id", async (req, res, next) => {
  try {
    const d = req.body;
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ ok: false, error: "Not found" }); return; }
    await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        title: d.title, description: d.description || null,
        clientId: d.clientId, categoryId: d.categoryId || null,
        assigneeId: d.assigneeId || null, managerId: d.managerId || null,
        priority: d.priority, billable: d.billable, invoiceStatus: d.invoiceStatus,
        targetMinutes: d.targetMinutes != null && d.targetMinutes !== "" ? Number(d.targetMinutes) : null,
        documentsRequired: d.documentsRequired || null,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
      },
    });
    if (d.assigneeId && d.assigneeId !== existing.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: d.assigneeId } });
      const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
      if (assignee && ticket) notifyTicketAssigned(ticket, assignee).catch(notifyFailed("ASSIGNED"));
    }
    await prisma.activityLog.create({ data: { firmId: req.user!.firm, type: "UPDATED", actorId: req.user!.sub, ticketId: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/tickets/:id/status
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body as { status: TicketStatus };
    await prisma.ticket.update({ where: { id: req.params.id }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
    await prisma.activityLog.create({ data: { firmId: req.user!.firm, type: "STATUS_CHANGED", actorId: req.user!.sub, ticketId: req.params.id, metadata: { status } } });
    // On completion, notify assignee + manager + client.
    if (status === "DONE") notifyTicketParticipants(req.params.id, "COMPLETED").catch(notifyFailed("COMPLETED"));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/tickets/:id/assign
router.patch("/:id/assign", async (req, res, next) => {
  try {
    const { assigneeId } = req.body;
    const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data: { assigneeId: assigneeId || null } });
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (assignee) notifyTicketAssigned(ticket, assignee).catch(notifyFailed("ASSIGNED"));
    }
    await prisma.activityLog.create({ data: { firmId: req.user!.firm, type: "ASSIGNED", actorId: req.user!.sub, ticketId: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/tickets/:id/subtasks/:subId
router.patch("/:id/subtasks/:subId", async (req, res, next) => {
  try {
    const { status } = req.body as { status: "TODO" | "DONE" };
    await prisma.ticketSubtask.update({ where: { id: req.params.subId }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
    await prisma.activityLog.create({ data: { firmId: req.user!.firm, type: "SUBTASK_TOGGLED", actorId: req.user!.sub, ticketId: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/tickets/:id/time-entries  (log time on a ticket)
router.post("/:id/time-entries", async (req, res, next) => {
  try {
    const schema = z.object({
      minutes: z.coerce.number().int().min(1, "Enter the time spent"),
      workDate: z.string().optional(),
      startMinutes: z.coerce.number().int().min(0).max(1439).optional(),
      description: z.string().optional(),
      billable: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const d = parsed.data!;
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!ticket) {
      res.status(404).json({ ok: false, error: "Ticket not found." });
      return;
    }
    await prisma.timeEntry.create({
      data: {
        firmId: req.user!.firm,
        ticketId: req.params.id,
        userId: req.user!.sub,
        minutes: d.minutes,
        startMinutes: d.startMinutes ?? 540,
        workDate: d.workDate ? new Date(d.workDate) : new Date(),
        description: d.description || null,
        billable: d.billable ?? true,
      },
    });
    await prisma.activityLog.create({ data: { firmId: req.user!.firm, type: "TIME_LOGGED", actorId: req.user!.sub, ticketId: req.params.id, metadata: { minutes: d.minutes } } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/tickets/:id/comments  (multipart: body + parentId + files[])
router.post("/:id/comments", upload.array("files", 5), async (req, res, next) => {
  try {
    const body = (req.body.body ?? "").toString();
    const parentId = req.body.parentId ? req.body.parentId.toString() : null;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!body.trim() && files.length === 0) {
      res.status(400).json({ ok: false, error: "Add a comment or attach a file." });
      return;
    }
    const comment = await prisma.ticketComment.create({
      data: {
        firmId: req.user!.firm,
        ticketId: req.params.id,
        authorId: req.user!.sub,
        body: body.trim() || "(attachment)",
        parentId,
        attachments: {
          create: files.map((f) => ({
            firmId: req.user!.firm,
            ticketId: req.params.id,
            uploadedById: req.user!.sub,
            fileName: f.originalname,
            // Key includes the per-firm subdirectory the file was stored in.
            storageKey: `${req.user!.firm}/${f.filename}`,
            mimeType: f.mimetype,
            sizeBytes: f.size,
          })),
        },
      },
      include: { author: true, attachments: true, replies: { include: { author: true, attachments: true } } },
    });
    await prisma.activityLog.create({ data: { firmId: req.user!.firm, type: files.length ? "ATTACHMENT_ADDED" : "COMMENTED", actorId: req.user!.sub, ticketId: req.params.id } });
    res.json({ ok: true, data: comment });
  } catch (err) { next(err); }
});

// DELETE /api/tickets/:id  (CA only — permanent). Children (subtasks, comments,
// time entries, attachments, activity logs) cascade on ticketId.
router.delete("/:id", requireCA, async (req, res, next) => {
  try {
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) { res.status(404).json({ ok: false, error: "Not found" }); return; }
    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
