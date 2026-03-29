import { z } from "zod";

export const createBudgetSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  budgetAmount: z.number().positive(),
  categoryLimits: z.record(z.string(), z.number().positive()).optional(),
});

export const updateBudgetSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),
  budgetAmount: z.number().positive().optional(),
  categoryLimits: z.record(z.string(), z.number().positive()).optional(),
});

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetSchema = z.infer<typeof updateBudgetSchema>;
