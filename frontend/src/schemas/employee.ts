import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["CA", "EMPLOYEE"]),
  // Required on create; optional on edit (leave blank to keep current).
  password: z
    .string()
    .min(8, "At least 8 characters")
    .optional()
    .or(z.literal("")),
});

export type EmployeeFormValues = z.input<typeof employeeSchema>;
