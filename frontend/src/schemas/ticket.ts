import { z } from "zod";

const FREQ = [
  "ONE_TIME",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
  "CUSTOM",
] as const;
const PRIORITY = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const BILLABLE = ["BILLABLE", "NON_BILLABLE"] as const;
const INVOICE_NOTE = ["NOT_APPLICABLE", "PENDING", "ISSUED"] as const;

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalId = z.string().optional().or(z.literal(""));
const optionalDate = z.string().optional().or(z.literal("")); // "yyyy-mm-dd"

export const createTicketSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  clientId: z.string().min(1, "Select a client"),
  templateId: optionalId,
  categoryId: optionalId,
  assigneeId: optionalId,
  priority: z.enum(PRIORITY),
  frequency: z.enum(FREQ),
  billable: z.enum(BILLABLE),
  description: optionalText,
  documentsRequired: optionalText,
  startDate: optionalDate,
  dueDate: optionalDate,
  subtasks: z.array(z.object({ title: z.string().trim().min(1) })).default([]),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateTicketFormValues = z.input<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  categoryId: optionalId,
  assigneeId: optionalId,
  priority: z.enum(PRIORITY),
  frequency: z.enum(FREQ),
  billable: z.enum(BILLABLE),
  invoiceStatus: z.enum(INVOICE_NOTE),
  description: optionalText,
  documentsRequired: optionalText,
  startDate: optionalDate,
  dueDate: optionalDate,
});

export type UpdateTicketFormValues = z.input<typeof updateTicketSchema>;
