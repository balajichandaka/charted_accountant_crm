import { z } from "zod";

const RECURRING_FREQ = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
] as const;

export const recurringSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  templateId: z.string().min(1, "Select a template"),
  assigneeId: z.string().optional().or(z.literal("")),
  frequency: z.enum(RECURRING_FREQ),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dueOffsetDays: z.coerce.number().int().min(0).max(90).default(7),
  firstRunDate: z.string().min(1, "Pick the first run date"), // yyyy-mm-dd
});

export type RecurringFormValues = z.input<typeof recurringSchema>;
