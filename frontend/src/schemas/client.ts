import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required"),
  companyName: optionalText,
  gstNumber: optionalText,
  billTo: optionalText,
  shipTo: optionalText,
  rcm: z.boolean().default(false),
  creditPeriodDays: z.coerce
    .number()
    .int()
    .min(0, "Must be 0 or more")
    .max(365, "Too large")
    .optional(),
  state: optionalText,
  fullAddress: optionalText,
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: optionalText,
  notes: optionalText,
});

export type ClientInput = z.infer<typeof clientSchema>;
// Form-facing type (pre-coercion) for react-hook-form + zodResolver.
export type ClientFormValues = z.input<typeof clientSchema>;
