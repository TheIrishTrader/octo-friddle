import type { FastifyInstance } from "fastify";
import { BudgetService } from "../services/budget.service";
import { createBudgetSchema } from "@grocery/shared";

const budgetService = new BudgetService();

export async function budgetRoutes(app: FastifyInstance) {
  // Get spending trends for the last N months
  // NOTE: registered before /budget/:month to avoid route conflict
  app.get<{ Querystring: { months?: string } }>(
    "/budget/trends",
    async (request) => {
      const months = parseInt(request.query.months ?? "6", 10);
      return budgetService.getSpendingTrends(months);
    },
  );

  // Get budget + spending summary for a specific month
  app.get<{ Params: { month: string } }>(
    "/budget/:month",
    async (request, reply) => {
      const { month } = request.params;
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return reply
          .code(400)
          .send({ error: "Month must be in YYYY-MM format" });
      }
      return budgetService.getSpendingSummary(month);
    },
  );

  // Create or update a budget
  app.post("/budget", async (request) => {
    const body = createBudgetSchema.parse(request.body);
    return budgetService.createOrUpdateBudget(body);
  });
}
