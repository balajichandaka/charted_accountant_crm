import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  colorHex: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use a hex color like #2563eb")
    .optional()
    .or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;
