import { Router } from "express";
import { z } from "zod";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from "date-fns";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireCA } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// Parse ?from&to (yyyy-MM-dd). Defaults to the current Mon–Sun week.
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

// GET /api/timesheet?from&to&userId  — one user's entries for the week (Tier 1).
// Non-CA users may only read their own; CA may pass ?userId to view anyone.
router.get("/", async (req, res, next) => {
  try {
    const { from, to } = range(req);
    const requested = req.query.userId ? String(req.query.userId) : undefined;
    const userId = requested && req.user?.role === "CA" ? requested : req.user!.sub;

    const entries = await prisma.timeEntry.findMany({
      where: { userId, workDate: { gte: from, lte: to } },
      include: { ticket: { select: { id: true, ticketNumber: true, title: true, client: { select: { name: true } } } } },
      orderBy: { workDate: "asc" },
    });

    res.json({
      ok: true,
      data: {
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
        userId,
        entries: entries.map((e) => ({
          id: e.id,
          ticketId: e.ticketId,
          ticketNumber: e.ticket.ticketNumber,
          ticketTitle: e.ticket.title,
          clientName: e.ticket.client.name,
          minutes: e.minutes,
          billable: e.billable,
          description: e.description,
          workDate: e.workDate,
        })),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/timesheet/team?from&to  — every active user's weekly totals (Tier 2, CA only).
router.get("/team", requireCA, async (req, res, next) => {
  try {
    const { from, to } = range(req);
    const [users, entries] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.timeEntry.findMany({
        where: { workDate: { gte: from, lte: to } },
        select: { userId: true, minutes: true, billable: true, workDate: true },
      }),
    ]);

    const byUser = new Map(
      users.map((u) => [u.id, { id: u.id, name: u.name, totalMinutes: 0, billableMinutes: 0, perDay: {} as Record<string, number> }])
    );
    for (const e of entries) {
      const row = byUser.get(e.userId);
      if (!row) continue; // entry by an inactive/removed user — skip
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

const editSchema = z.object({
  minutes: z.coerce.number().int().min(1).optional(),
  workDate: z.string().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
});

// PATCH /api/timesheet/entries/:id  — edit an entry (owner or CA).
router.patch("/entries/:id", async (req, res, next) => {
  try {
    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!entry) { res.status(404).json({ ok: false, error: "Time entry not found." }); return; }
    if (entry.userId !== req.user?.sub && req.user?.role !== "CA") {
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
        ...(d.workDate ? { workDate: new Date(d.workDate) } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.billable !== undefined ? { billable: d.billable } : {}),
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/timesheet/entries/:id  — delete an entry (owner or CA).
router.delete("/entries/:id", async (req, res, next) => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!entry) { res.status(404).json({ ok: false, error: "Time entry not found." }); return; }
    if (entry.userId !== req.user?.sub && req.user?.role !== "CA") {
      res.status(403).json({ ok: false, error: "You can only delete your own time entries." });
      return;
    }
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
