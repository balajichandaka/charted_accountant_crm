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

export const templateSchema = z.object({
  name: z.string().trim().min(1, "Task name is required"),
  categoryId: z.string().min(1, "Select a category"),
  description: z.string().trim().optional().or(z.literal("")),
  documentsRequired: z.string().trim().optional().or(z.literal("")),
  defaultFrequency: z.enum(FREQ),
  defaultBillable: z.enum(BILLABLE),
  defaultPriority: z.enum(PRIORITY),
  subtasks: z
    .array(z.object({ title: z.string().trim().min(1, "Sub-task cannot be empty") }))
    .default([]),
});

export type TemplateInput = z.infer<typeof templateSchema>;
export type TemplateFormValues = z.input<typeof templateSchema>;
