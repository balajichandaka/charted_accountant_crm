// Domain types for the frontend — no @prisma/client dependency.
// These mirror the Prisma schema enums and model shapes used across components.

export type Role = "CA" | "EMPLOYEE";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "REVIEW" | "BLOCKED" | "DONE" | "CANCELLED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Frequency = "ONE_TIME" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM";
export type BillableType = "BILLABLE" | "NON_BILLABLE";
export type InvoiceStatusNote = "NOT_APPLICABLE" | "PENDING" | "ISSUED";
export type SubtaskStatus = "TODO" | "DONE";
export type ActivityType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "COMMENTED"
  | "SUBTASK_TOGGLED"
  | "TIME_LOGGED"
  | "ATTACHMENT_ADDED"
  | "UPDATED"
  | "RECURRING_GENERATED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Client = {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export type Category = {
  id: string;
  name: string;
  colorHex: string | null;
  isActive: boolean;
};

export type Ticket = {
  id: string;
  ticketNumber: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: Priority;
  frequency: Frequency;
  billable: BillableType;
  invoiceStatus: InvoiceStatusNote;
  documentsRequired: string | null;
  startDate: Date | string | null;
  dueDate: Date | string | null;
  completedAt: Date | string | null;
  clientId: string;
  categoryId: string | null;
  templateId: string | null;
  assigneeId: string | null;
  reporterId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};
