import type {
  TicketStatus,
  Priority,
  Frequency,
  BillableType,
  InvoiceStatusNote,
} from "@/types/domain";

// Human-readable labels + theme color classes for enums.
// Colors reference the CSS tokens defined in globals.css (status-*, priority-*).

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const STATUS_DOT: Record<TicketStatus, string> = {
  OPEN: "bg-status-open",
  IN_PROGRESS: "bg-status-in-progress",
  REVIEW: "bg-status-review",
  BLOCKED: "bg-status-blocked",
  DONE: "bg-status-done",
  CANCELLED: "bg-status-cancelled",
};

export const STATUS_BADGE: Record<TicketStatus, string> = {
  OPEN: "border-status-open/30 bg-status-open/10 text-status-open",
  IN_PROGRESS:
    "border-status-in-progress/30 bg-status-in-progress/10 text-status-in-progress",
  REVIEW: "border-status-review/30 bg-status-review/10 text-status-review",
  BLOCKED: "border-status-blocked/30 bg-status-blocked/10 text-status-blocked",
  DONE: "border-status-done/30 bg-status-done/10 text-status-done",
  CANCELLED:
    "border-status-cancelled/30 bg-status-cancelled/10 text-status-cancelled",
};

// Board column order
export const STATUS_ORDER: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "REVIEW",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];

// Statuses shown as Kanban columns by default (Cancelled hidden unless filtered)
export const BOARD_COLUMNS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "REVIEW",
  "BLOCKED",
  "DONE",
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_BADGE: Record<Priority, string> = {
  LOW: "border-priority-low/30 bg-priority-low/10 text-priority-low",
  MEDIUM: "border-priority-medium/30 bg-priority-medium/10 text-priority-medium",
  HIGH: "border-priority-high/30 bg-priority-high/10 text-priority-high",
  URGENT: "border-priority-urgent/30 bg-priority-urgent/10 text-priority-urgent",
};

export const PRIORITY_ORDER: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  ONE_TIME: "One time",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half Yearly",
  YEARLY: "Yearly",
  CUSTOM: "Custom",
};

export const RECURRING_FREQUENCIES: Frequency[] = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
];

export const BILLABLE_LABEL: Record<BillableType, string> = {
  BILLABLE: "Billable",
  NON_BILLABLE: "Non-Billable",
};

export const INVOICE_NOTE_LABEL: Record<InvoiceStatusNote, string> = {
  NOT_APPLICABLE: "Not Applicable",
  PENDING: "Pending",
  ISSUED: "Issued",
};

// Generic helper to turn an enum-label record into <Select> options
export function toOptions<T extends string>(
  record: Record<T, string>,
  only?: T[]
): { value: T; label: string }[] {
  const keys = (only ?? (Object.keys(record) as T[])) as T[];
  return keys.map((value) => ({ value, label: record[value] }));
}
