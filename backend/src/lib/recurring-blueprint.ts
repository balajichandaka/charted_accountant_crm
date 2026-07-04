import { startOfDay } from "date-fns";
import type {
  Prisma,
  Ticket,
  TicketSubtask,
  WorkTemplate,
  TemplateSubtask,
  RecurringSchedule,
} from "@prisma/client";
import { prisma } from "./prisma";

type ScheduleWithTemplate = RecurringSchedule & {
  template: WorkTemplate & { subtasks: TemplateSubtask[] };
};

type PrototypeTicket = Ticket & { subtasks: TicketSubtask[] };

/** Ticket field snapshot saved when a schedule is created. */
export type RecurringScheduleSnapshot = {
  title?: string | null;
  description?: string | null;
  categoryId?: string | null;
  managerId?: string | null;
  reporterId?: string | null;
  priority?: RecurringSchedule["priority"];
  billable?: RecurringSchedule["billable"];
  invoiceStatus?: RecurringSchedule["invoiceStatus"];
  targetMinutes?: number | null;
  documentsRequired?: string | null;
};

export function snapshotFromTicketInput(input: {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  managerId?: string | null;
  reporterId: string;
  priority: NonNullable<RecurringSchedule["priority"]>;
  billable: NonNullable<RecurringSchedule["billable"]>;
  invoiceStatus: NonNullable<RecurringSchedule["invoiceStatus"]>;
  targetMinutes?: number | null;
  documentsRequired?: string | null;
}): RecurringScheduleSnapshot {
  return {
    title: input.title,
    description: input.description ?? null,
    categoryId: input.categoryId ?? null,
    managerId: input.managerId ?? null,
    reporterId: input.reporterId,
    priority: input.priority,
    billable: input.billable,
    invoiceStatus: input.invoiceStatus,
    targetMinutes: input.targetMinutes ?? null,
    documentsRequired: input.documentsRequired ?? null,
  };
}

export function snapshotFromTemplate(
  template: Pick<
    WorkTemplate,
    "name" | "description" | "categoryId" | "defaultPriority" | "defaultBillable" | "documentsRequired"
  >,
  reporterId: string
): RecurringScheduleSnapshot {
  return {
    title: template.name,
    description: template.description,
    categoryId: template.categoryId,
    managerId: null,
    reporterId,
    priority: template.defaultPriority,
    billable: template.defaultBillable,
    invoiceStatus: "NOT_APPLICABLE",
    targetMinutes: null,
    documentsRequired: template.documentsRequired,
  };
}

/** Manual seed ticket linked to the schedule (periodLabel null). */
export async function findSchedulePrototypeTicket(scheduleId: string): Promise<PrototypeTicket | null> {
  return prisma.ticket.findFirst({
    where: { recurringScheduleId: scheduleId, periodLabel: null },
    orderBy: { createdAt: "asc" },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });
}

export function buildRecurringTicketCreateInput(args: {
  schedule: ScheduleWithTemplate;
  prototype: PrototypeTicket | null;
  firmId: string;
  caUserId: string;
  periodLabel: string;
  runAt: Date;
}): Prisma.TicketUncheckedCreateInput {
  const { schedule, prototype, firmId, caUserId, periodLabel, runAt } = args;
  const startDate = startOfDay(runAt);
  const dueDate = new Date(startDate.getTime() + schedule.dueOffsetDays * 86_400_000);

  const assigneeId = schedule.assigneeId ?? prototype?.assigneeId ?? null;
  const managerId = schedule.managerId ?? prototype?.managerId ?? null;
  const reporterId = schedule.reporterId ?? prototype?.reporterId ?? assigneeId ?? caUserId;

  const title = schedule.title ?? prototype?.title ?? schedule.template.name;
  const description = schedule.description ?? prototype?.description ?? schedule.template.description;
  const categoryId = schedule.categoryId ?? prototype?.categoryId ?? schedule.template.categoryId;
  const priority = schedule.priority ?? prototype?.priority ?? schedule.template.defaultPriority;
  const billable = schedule.billable ?? prototype?.billable ?? schedule.template.defaultBillable;
  const invoiceStatus = schedule.invoiceStatus ?? prototype?.invoiceStatus ?? "NOT_APPLICABLE";
  const targetMinutes = schedule.targetMinutes ?? prototype?.targetMinutes ?? null;
  const documentsRequired =
    schedule.documentsRequired ??
    prototype?.documentsRequired ??
    schedule.template.documentsRequired;

  const subtasksSource = prototype?.subtasks.length
    ? prototype.subtasks
    : schedule.template.subtasks;

  return {
    firmId,
    title,
    description,
    clientId: schedule.clientId,
    categoryId,
    templateId: schedule.templateId,
    assigneeId,
    managerId,
    reporterId,
    priority,
    frequency: schedule.frequency,
    billable,
    invoiceStatus,
    targetMinutes,
    documentsRequired,
    startDate,
    dueDate,
    recurringScheduleId: schedule.id,
    periodLabel,
    subtasks: {
      create: subtasksSource.map((s) => ({
        firmId,
        title: s.title,
        order: s.order,
        assigneeId: "assigneeId" in s ? s.assigneeId : null,
      })),
    },
    activities: { create: { firmId, type: "RECURRING_GENERATED" } },
  };
}
