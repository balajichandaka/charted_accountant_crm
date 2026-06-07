import { Router } from "express";
import { subDays, startOfDay, endOfWeek } from "date-fns";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const OPEN = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED"] as const;

router.get("/dashboard", async (req, res, next) => {
  try {
    const isCA = req.user?.role === "CA";
    const userId = req.user!.sub;
    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const last30 = subDays(startOfDay(now), 30);
    const scope = isCA ? {} : { assigneeId: userId };
    const OPEN_S = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED"] as const;

    const [openCount, dueThisWeek, completed30, activeClients, byStatus, dueSoon, workload] = await Promise.all([
      prisma.ticket.count({ where: { ...scope, status: { in: [...OPEN_S] } } }),
      prisma.ticket.count({ where: { ...scope, status: { in: [...OPEN_S] }, dueDate: { gte: now, lte: weekEnd } } }),
      prisma.ticket.count({ where: { ...scope, status: "DONE", completedAt: { gte: last30 } } }),
      isCA ? prisma.client.count({ where: { isActive: true } }) : prisma.ticket.count({ where: { ...scope, status: "DONE" } }),
      prisma.ticket.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      prisma.ticket.findMany({ where: { ...scope, status: { in: [...OPEN_S] } }, orderBy: [{ dueDate: "asc" }, { priority: "desc" }], take: 8, include: { client: true, assignee: true } }),
      isCA ? prisma.ticket.groupBy({ by: ["assigneeId"], where: { status: { in: [...OPEN_S] } }, _count: { _all: true } }) : Promise.resolve([]),
    ]);

    let workloadRows: { name: string; count: number }[] = [];
    if (isCA && Array.isArray(workload) && workload.length) {
      const ids = workload.map((w) => w.assigneeId).filter(Boolean) as string[];
      const users = await prisma.user.findMany({ where: { id: { in: ids } } });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      workloadRows = workload.map((w) => ({ name: w.assigneeId ? nameById.get(w.assigneeId) ?? "Unknown" : "Unassigned", count: w._count._all })).sort((a, b) => b.count - a.count);
    }

    res.json({ ok: true, data: { openCount, dueThisWeek, completed30, activeClients, byStatus, dueSoon, workloadRows } });
  } catch (err) { next(err); }
});

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const last30 = subDays(startOfDay(now), 30);

    const [total, open, done30, byStatus, employees, solvedByEmployee, categoryMix, billableMix, throughputRaw, topClientsRaw, clientHealthRaw] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: { in: [...OPEN] } } }),
      prisma.ticket.count({ where: { status: "DONE", completedAt: { gte: last30 } } }),
      prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.ticket.groupBy({ by: ["assigneeId"], where: { status: "DONE" }, _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["billable"], _count: { _all: true } }),
      prisma.$queryRaw<{ month: Date; count: bigint }[]>`SELECT date_trunc('month', "completedAt") AS month, count(*) FROM "Ticket" WHERE status = 'DONE' AND "completedAt" IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12`,
      prisma.ticket.groupBy({ by: ["clientId"], where: { status: { in: [...OPEN] } }, _count: { _all: true }, orderBy: { _count: { clientId: "desc" } }, take: 10 }),
      prisma.client.findMany({ where: { isActive: true }, include: { _count: { select: { tickets: true } } } }),
    ]);

    const [categories] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, colorHex: true } }),
    ]);

    const clientIds = topClientsRaw.map((r) => r.clientId);
    const clientNames = await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } });
    const clientNameMap = new Map(clientNames.map((c) => [c.id, c.name]));
    const nameById = new Map(employees.map((e) => [e.id, e.name]));
    const catNameById = new Map(categories.map((c) => [c.id, { name: c.name, color: c.colorHex ?? "#64748b" }]));

    res.json({
      ok: true,
      data: {
        total, open, done30,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
        solvedByEmployee: solvedByEmployee.map((s) => ({ name: s.assigneeId ? (nameById.get(s.assigneeId) ?? "Unknown") : "Unassigned", count: s._count._all })),
        categoryMix: categoryMix.filter((c) => c.categoryId).map((c) => ({ name: catNameById.get(c.categoryId!)?.name ?? "Unknown", color: catNameById.get(c.categoryId!)?.color ?? "#64748b", count: c._count._all })),
        billableMix: billableMix.map((b) => ({ billable: b.billable, count: b._count._all })),
        throughput: throughputRaw.map((r) => ({ month: r.month, count: Number(r.count) })).reverse(),
        topClients: topClientsRaw.map((r) => ({ name: clientNameMap.get(r.clientId) ?? "Unknown", count: r._count._all })),
        clientHealth: clientHealthRaw.map((c) => ({ id: c.id, name: c.name, totalTickets: c._count.tickets })),
      },
    });
  } catch (err) { next(err); }
});

export default router;
