import type { TicketStatus } from "@/types/domain";

export type Frequency =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY";

export type ScheduleRow = {
  id: string;
  clientName: string;
  templateName: string;
  categoryName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  frequency: Frequency;
  dayOfMonth: number | null;
  dueOffsetDays: number;
  nextRunAt: string | null;
  lastGeneratedFor: string | null;
  isActive: boolean;
};

export type ScheduleDetailTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: TicketStatus;
  periodLabel: string | null;
  dueDate: string | null;
  createdAt: string;
  origin: "AUTO" | "MANUAL";
};

export type ScheduleDetail = {
  tickets: ScheduleDetailTicket[];
  upcomingRuns: string[];
};
