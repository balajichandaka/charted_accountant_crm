import { Router } from "express";
import { subDays, startOfDay, endOfDay, endOfWeek, startOfWeek } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const OPEN = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED"] as const;
const LIST_SELECT = {
  id: true, ticketNumber: true, title: true, status: true, priority: true,
  dueDate: true, client: { select: { name: true } },
};

router.get("/dashboard", async (req, res, next) => {
  try {
    const isCA = req.user?.role === "CA";
    const userId = req.user!.sub;
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const dayStart = startOfDay(now);
    const last30 = subDays(dayStart, 30);
    // Non-CA users see tickets where they are assignee OR manager.
    const scope = isCA ? {} : { OR: [{ assigneeId: userId }, { managerId: userId }] };

    const [
      openCount, dueThisWeek, completed30, activeClients, byStatus,
      openTickets, dueThisWeekTickets, completedTickets, workload,
      myToday, myWeek,
    ] = await Promise.all([
      prisma.ticket.count({ where: { ...scope, status: { in: [...OPEN] } } }),
      prisma.ticket.count({ where: { ...scope, status: { in: [...OPEN] }, dueDate: { gte: now, lte: weekEnd } } }),
      prisma.ticket.count({ where: { ...scope, status: "DONE", completedAt: { gte: last30 } } }),
      isCA ? prisma.client.count({ where: { isActive: true } }) : prisma.ticket.count({ where: { ...scope, status: "DONE" } }),
      prisma.ticket.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      prisma.ticket.findMany({ where: { ...scope, status: { in: [...OPEN] } }, orderBy: [{ dueDate: "asc" }, { priority: "desc" }], take: 50, select: LIST_SELECT }),
      prisma.ticket.findMany({ where: { ...scope, status: { in: [...OPEN] }, dueDate: { gte: now, lte: weekEnd } }, orderBy: { dueDate: "asc" }, take: 50, select: LIST_SELECT }),
      prisma.ticket.findMany({ where: { ...scope, status: "DONE", completedAt: { gte: last30 } }, orderBy: { completedAt: "desc" }, take: 50, select: LIST_SELECT }),
      isCA ? prisma.ticket.groupBy({ by: ["assigneeId"], where: { status: { in: [...OPEN] } }, _count: { _all: true } }) : Promise.resolve([]),
      prisma.timeEntry.aggregate({ where: { userId, workDate: { gte: dayStart } }, _sum: { minutes: true } }),
      prisma.timeEntry.aggregate({ where: { userId, workDate: { gte: weekStart } }, _sum: { minutes: true } }),
    ]);

    let workloadRows: { name: string; count: number }[] = [];
    if (isCA && Array.isArray(workload) && workload.length) {
      const ids = workload.map((w) => w.assigneeId).filter(Boolean) as string[];
      const users = await prisma.user.findMany({ where: { id: { in: ids } } });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      workloadRows = workload.map((w) => ({ name: w.assigneeId ? nameById.get(w.assigneeId) ?? "Unknown" : "Unassigned", count: w._count._all })).sort((a, b) => b.count - a.count);
    }

    res.json({
      ok: true,
      data: {
        openCount, dueThisWeek, completed30, activeClients,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
        dueSoon: openTickets.slice(0, 8),
        openTickets, dueThisWeekTickets, completedTickets,
        workloadRows,
        myHoursToday: Math.round((myToday._sum.minutes ?? 0) / 6) / 10,
        myHoursThisWeek: Math.round((myWeek._sum.minutes ?? 0) / 6) / 10,
      },
    });
  } catch (err) { next(err); }
});

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    // Date range: defaults to the last 30 days, overridable via ?from=&to=.
    const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(now);
    const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : startOfDay(subDays(now, 30));
    const assigneeId = req.query.assigneeId ? String(req.query.assigneeId) : undefined;

    // Per-metric scoping (see design): "created" widgets filter on createdAt,
    // "completed" widgets on completedAt, point-in-time state widgets on neither.
    const assigneeWhere = assigneeId ? { assigneeId } : {};
    const createdWhere = { ...assigneeWhere, createdAt: { gte: from, lte: to } };
    const completedWhere = { ...assigneeWhere, status: "DONE" as const, completedAt: { gte: from, lte: to } };
    const stateWhere = assigneeWhere; // open counts / top clients are point-in-time
    // Raw-SQL fragments for the optional assignee filter.
    const ticketAssigneeSql = assigneeId ? Prisma.sql`AND "assigneeId" = ${assigneeId}` : Prisma.empty;
    const timeUserSql = assigneeId ? Prisma.sql`AND "userId" = ${assigneeId}` : Prisma.empty;
    const timeWhere = { workDate: { gte: from, lte: to }, ...(assigneeId ? { userId: assigneeId } : {}) };

    const [total, open, done30, byStatus, employees, solvedByEmployee, categoryMix, billableMix, throughputRaw, topClientsRaw, clientHealthRaw, hoursByEmployeeRaw, hoursPerDayRaw] = await Promise.all([
      prisma.ticket.count({ where: createdWhere }),
      prisma.ticket.count({ where: { ...stateWhere, status: { in: [...OPEN] } } }),
      prisma.ticket.count({ where: completedWhere }),
      prisma.ticket.groupBy({ by: ["status"], where: createdWhere, _count: { _all: true } }),
      prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.ticket.groupBy({ by: ["assigneeId"], where: completedWhere, _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["categoryId"], where: createdWhere, _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["billable"], where: createdWhere, _count: { _all: true } }),
      prisma.$queryRaw<{ month: Date; count: bigint }[]>`SELECT date_trunc('month', "completedAt") AS month, count(*) FROM "Ticket" WHERE status = 'DONE' AND "completedAt" IS NOT NULL AND "completedAt" >= ${from} AND "completedAt" <= ${to} ${ticketAssigneeSql} GROUP BY month ORDER BY month ASC`,
      prisma.ticket.groupBy({ by: ["clientId"], where: { ...stateWhere, status: { in: [...OPEN] } }, _count: { _all: true }, orderBy: { _count: { clientId: "desc" } }, take: 10 }),
      prisma.client.findMany({ where: { isActive: true }, include: { _count: { select: { tickets: true } } } }),
      prisma.timeEntry.groupBy({ by: ["userId"], where: timeWhere, _sum: { minutes: true } }),
      prisma.$queryRaw<{ day: Date; minutes: bigint }[]>`SELECT date_trunc('day', "workDate") AS day, sum(minutes) AS minutes FROM "TimeEntry" WHERE "workDate" >= ${from} AND "workDate" <= ${to} ${timeUserSql} GROUP BY day ORDER BY day ASC`,
    ]);

    const categories = await prisma.category.findMany({ select: { id: true, name: true, colorHex: true } });

    const clientIds = topClientsRaw.map((r) => r.clientId);
    const clientNames = await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } });
    const clientNameMap = new Map(clientNames.map((c) => [c.id, c.name]));
    const nameById = new Map(employees.map((e) => [e.id, e.name]));
    const catNameById = new Map(categories.map((c) => [c.id, { name: c.name, color: c.colorHex ?? "#64748b" }]));

    res.json({
      ok: true,
      data: {
        total, open, done30,
        employees,
        clients: clientHealthRaw.map((c) => ({ id: c.id, name: c.name })),
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
        solvedByEmployee: solvedByEmployee.map((s) => ({ name: s.assigneeId ? (nameById.get(s.assigneeId) ?? "Unknown") : "Unassigned", count: s._count._all })),
        categoryMix: categoryMix.filter((c) => c.categoryId).map((c) => ({ name: catNameById.get(c.categoryId!)?.name ?? "Unknown", color: catNameById.get(c.categoryId!)?.color ?? "#64748b", count: c._count._all })),
        billableMix: billableMix.map((b) => ({ billable: b.billable, count: b._count._all })),
        throughput: throughputRaw.map((r) => ({ month: r.month, count: Number(r.count) })),
        topClients: topClientsRaw.map((r) => ({ name: clientNameMap.get(r.clientId) ?? "Unknown", count: r._count._all })),
        clientHealth: clientHealthRaw.map((c) => ({ id: c.id, name: c.name, totalTickets: c._count.tickets })),
        hoursByEmployee: hoursByEmployeeRaw
          .map((h) => ({ name: nameById.get(h.userId) ?? "Unknown", hours: Math.round((h._sum.minutes ?? 0) / 6) / 10 }))
          .filter((h) => h.hours > 0)
          .sort((a, b) => b.hours - a.hours),
        hoursPerDay: hoursPerDayRaw.map((r) => ({ day: r.day, hours: Math.round(Number(r.minutes) / 6) / 10 })),
      },
    });
  } catch (err) { next(err); }
});

// Flat per-ticket rows for the Analytics export, filtered like the page
// (date range on createdAt + assignee) plus optional status/client/category.
router.get("/report", async (req, res, next) => {
  try {
    const now = new Date();
    const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(now);
    const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : startOfDay(subDays(now, 30));

    // Apply the range to the chosen date field (Created / Start / Due).
    const range = { gte: from, lte: to };
    const dateType = String(req.query.dateType ?? "createdAt");
    const where: Prisma.TicketWhereInput =
      dateType === "startDate"
        ? { startDate: range }
        : dateType === "dueDate"
          ? { dueDate: range }
          : { createdAt: range };
    if (req.query.assigneeId) {
      const vals = String(req.query.assigneeId).split(",").filter(Boolean);
      where.assigneeId = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (req.query.status) {
      const vals = String(req.query.status).split(",").filter(Boolean);
      where.status = vals.length === 1 ? (vals[0] as Prisma.TicketWhereInput["status"]) : { in: vals as any[] };
    }
    if (req.query.clientId) {
      const vals = String(req.query.clientId).split(",").filter(Boolean);
      where.clientId = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (req.query.categoryId) {
      const vals = String(req.query.categoryId).split(",").filter(Boolean);
      where.categoryId = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (req.query.priority) {
      const vals = String(req.query.priority).split(",").filter(Boolean);
      where.priority = vals.length === 1 ? (vals[0] as any) : { in: vals as any[] };
    }

    const [tickets, clients, categories, employees] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { ticketNumber: "asc" },
        take: 2000,
        include: {
          client: { select: { name: true } },
          category: { select: { name: true } },
          assignee: { select: { name: true } },
          manager: { select: { name: true } },
          reporter: { select: { name: true } },
          timeEntries: { select: { minutes: true } },
        },
      }),
      prisma.client.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

    const toHours = (mins: number) => Math.round(mins / 6) / 10;
    const rows = tickets.map((t) => ({
      ticketNumber: t.ticketNumber,
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      frequency: t.frequency,
      billable: t.billable,
      invoiceStatus: t.invoiceStatus,
      clientName: t.client?.name ?? "",
      categoryName: t.category?.name ?? "",
      assigneeName: t.assignee?.name ?? "",
      managerName: t.manager?.name ?? "",
      reporterName: t.reporter?.name ?? "",
      periodLabel: t.periodLabel ?? "",
      documentsRequired: t.documentsRequired ?? "",
      startDate: t.startDate,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
      targetHours: t.targetMinutes != null ? toHours(t.targetMinutes) : null,
      loggedHours: toHours(t.timeEntries.reduce((sum, e) => sum + e.minutes, 0)),
    }));

    res.json({ ok: true, data: { tickets: rows, clients, categories, employees } });
  } catch (err) { next(err); }
});

export default router;
