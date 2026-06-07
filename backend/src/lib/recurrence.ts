import { addWeeks, addMonths, setDate, getISOWeek, getISOWeekYear, getDaysInMonth } from "date-fns";
import type { Frequency } from "@prisma/client";
import { prisma } from "./prisma";
import { notifyTicketAssigned } from "./notifications";

export function periodLabel(freq: Frequency, date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  switch (freq) {
    case "WEEKLY": return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
    case "MONTHLY": return `${y}-${String(m + 1).padStart(2, "0")}`;
    case "QUARTERLY": return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "HALF_YEARLY": return `${y}-H${m < 6 ? 1 : 2}`;
    case "YEARLY": return `${y}`;
    default: return `${y}-${String(m + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
}

export function computeNextRunAt(freq: Frequency, dayOfMonth?: number | null, from: Date = new Date()): Date {
  let next: Date;
  switch (freq) {
    case "WEEKLY": return addWeeks(from, 1);
    case "MONTHLY": next = addMonths(from, 1); break;
    case "QUARTERLY": next = addMonths(from, 3); break;
    case "HALF_YEARLY": next = addMonths(from, 6); break;
    case "YEARLY": next = addMonths(from, 12); break;
    default: next = addMonths(from, 1);
  }
  if (dayOfMonth && dayOfMonth >= 1) next = setDate(next, Math.min(dayOfMonth, getDaysInMonth(next)));
  return next;
}

export async function generateRecurringTickets() {
  const now = new Date();
  const schedules = await prisma.recurringSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { template: { include: { subtasks: { orderBy: { order: "asc" } } } }, assignee: true },
  });

  let generated = 0, skipped = 0;
  const errors: string[] = [];

  for (const schedule of schedules) {
    try {
      const label = periodLabel(schedule.frequency, now);
      const dueDate = new Date(now.getTime() + schedule.dueOffsetDays * 86400000);
      try {
        const caUser = await prisma.user.findFirst({ where: { role: "CA" } });
        const ticket = await prisma.ticket.create({
          data: {
            title: schedule.template.name,
            clientId: schedule.clientId,
            categoryId: schedule.template.categoryId,
            templateId: schedule.templateId,
            assigneeId: schedule.assigneeId,
            reporterId: schedule.assigneeId ?? caUser!.id,
            priority: schedule.template.defaultPriority,
            frequency: schedule.frequency,
            billable: schedule.template.defaultBillable,
            documentsRequired: schedule.template.documentsRequired,
            recurringScheduleId: schedule.id,
            periodLabel: label,
            dueDate,
            subtasks: { create: schedule.template.subtasks.map((s) => ({ title: s.title, order: s.order })) },
            activities: { create: { type: "RECURRING_GENERATED" } },
          },
        });
        if (schedule.assignee) notifyTicketAssigned(ticket, schedule.assignee).catch(console.error);
        generated++;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === "P2002") { skipped++; continue; }
        throw e;
      }
      const nextRunAt = computeNextRunAt(schedule.frequency, schedule.dayOfMonth, now);
      await prisma.recurringSchedule.update({ where: { id: schedule.id }, data: { lastGeneratedFor: now, nextRunAt } });
    } catch (err) {
      errors.push(`schedule ${schedule.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { generated, skipped, errors };
}
