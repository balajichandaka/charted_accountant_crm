import { Router } from "express";
import { z } from "zod";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from "date-fns";
import { prisma } from "../lib/prisma";
import { canViewEmployee, managedEmployeeIds } from "../lib/team-scope";
import { authMiddleware, requireLeadership } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

function range(req: { query: Record<string, unknown> }) {
  const now = new Date();
  const from = req.query.from
    ? startOfDay(new Date(String(req.query.from)))
    : startOfWeek(now, { weekStartsOn: 1 });
  const to = req.query.to
    ? endOfDay(new Date(String(req.query.to)))
    : endOfWeek(now, { weekStartsOn: 1 });
  return { from, to };
}

function mapEntry(e: {
  id: string;
  ticketId: string;
  minutes: number;
  startMinutes: number;
  billable: boolean;
  description: string | null;
  workDate: Date;
  ticket: { ticketNumber: number; title: string; client: { name: string } };
}) {
  return {
    id: e.id,
    ticketId: e.ticketId,
    ticketNumber: e.ticket.ticketNumber,
    ticketTitle: e.ticket.title,
    clientName: e.ticket.client.name,
    minutes: e.minutes,
    startMinutes: e.startMinutes,
    billable: e.billable,
    description: e.description,
    workDate: e.workDate,
  };
}

// GET /api/timesheet?from&to&userId
router.get("/", async (req, res, next) => {
  try {
    const { from, to } = range(req);
    const requested = req.query.userId ? String(req.query.userId) : undefined;
    const viewer = req.user!;
    let userId = viewer.sub;

    if (requested && requested !== viewer.sub) {
      const allowed = await canViewEmployee(viewer.role, viewer.sub, requested);
      if (!allowed) {
        res.status(403).json({ ok: false, error: "You cannot view this user's timesheet." });
        return;
      }
      userId = requested;
    }

    const entries = await prisma.timeEntry.findMany({
      where: { userId, workDate: { gte: from, lte: to } },
      include: { ticket: { select: { id: true, ticketNumber: true, title: true, client: { select: { name: true } } } } },
      orderBy: [{ workDate: "asc" }, { startMinutes: "asc" }],
    });

    res.json({
      ok: true,
      data: {
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
        userId,
        entries: entries.map(mapEntry),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/timesheet/team?from&to — CA: all active users; MANAGER: managed assignees
router.get("/team", requireLeadership, async (req, res, next) => {
  try {
    const { from, to } = range(req);
    const viewer = req.user!;

    let users;
    if (viewer.role === "CA") {
      users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    } else {
      const ids = await managedEmployeeIds(viewer.sub);
      users = await prisma.user.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        workDate: { gte: from, lte: to },
      },
      select: { userId: true, minutes: true, billable: true, workDate: true },
    });

    const byUser = new Map(
      users.map((u) => [u.id, { id: u.id, name: u.name, totalMinutes: 0, billableMinutes: 0, perDay: {} as Record<string, number> }])
    );
    for (const e of entries) {
      const row = byUser.get(e.userId);
      if (!row) continue;
      const day = format(e.workDate, "yyyy-MM-dd");
      row.totalMinutes += e.minutes;
      if (e.billable) row.billableMinutes += e.minutes;
      row.perDay[day] = (row.perDay[day] ?? 0) + e.minutes;
    }

    res.json({
      ok: true,
      data: {
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
        employees: Array.from(byUser.values()),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/timesheet/team/detail?userId&date
router.get("/team/detail", requireLeadership, async (req, res, next) => {
  try {
    const userId = String(req.query.userId ?? "");
    const date = String(req.query.date ?? "");
    if (!userId || !date) {
      res.status(400).json({ ok: false, error: "userId and date are required." });
      return;
    }

    const viewer = req.user!;
    const allowed = await canViewEmployee(viewer.role, viewer.sub, userId);
    if (!allowed) {
      res.status(403).json({ ok: false, error: "You cannot view this employee's entries." });
      return;
    }

    const dayStart = startOfDay(new Date(date));
    const dayEnd = endOfDay(new Date(date));

    const [user, entries] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } }),
      prisma.timeEntry.findMany({
        where: { userId, workDate: { gte: dayStart, lte: dayEnd } },
        include: { ticket: { select: { id: true, ticketNumber: true, title: true, client: { select: { name: true } } } } },
        orderBy: { startMinutes: "asc" },
      }),
    ]);

    if (!user) {
      res.status(404).json({ ok: false, error: "User not found." });
      return;
    }

    res.json({
      ok: true,
      data: {
        user,
        date,
        entries: entries.map(mapEntry),
        totalMinutes: entries.reduce((s, e) => s + e.minutes, 0),
      },
    });
  } catch (err) { next(err); }
});

const editSchema = z.object({
  minutes: z.coerce.number().int().min(1).optional(),
  startMinutes: z.coerce.number().int().min(0).max(1439).optional(),
  workDate: z.string().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
});

router.patch("/entries/:id", async (req, res, next) => {
  try {
    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!entry) { res.status(404).json({ ok: false, error: "Time entry not found." }); return; }
    if (entry.userId !== req.user?.sub) {
      res.status(403).json({ ok: false, error: "You can only edit your own time entries." });
      return;
    }
    const d = parsed.data;
    if (d.workDate && endOfDay(new Date(d.workDate)) > new Date()) {
      res.status(400).json({ ok: false, error: "Work date cannot be in the future." });
      return;
    }
    await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: {
        ...(d.minutes != null ? { minutes: d.minutes } : {}),
        ...(d.startMinutes != null ? { startMinutes: d.startMinutes } : {}),
        ...(d.workDate ? { workDate: new Date(d.workDate) } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.billable !== undefined ? { billable: d.billable } : {}),
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete("/entries/:id", async (req, res, next) => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!entry) { res.status(404).json({ ok: false, error: "Time entry not found." }); return; }
    if (entry.userId !== req.user?.sub) {
      res.status(403).json({ ok: false, error: "You can only delete your own time entries." });
      return;
    }
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
