import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "../db/index";
import { budgets } from "../db/schema/budgets";
import { purchaseHistory } from "../db/schema/receipts";
import { items } from "../db/schema/items";
import type { CreateBudgetSchema, UpdateBudgetSchema } from "@grocery/shared";
import type { BudgetSummary, SpendingTrend } from "@grocery/shared";

export class BudgetService {
  /**
   * Get budget for a specific month (YYYY-MM).
   */
  async getBudget(month: string) {
    const monthDate = `${month}-01`;
    return db.query.budgets.findFirst({
      where: eq(budgets.month, monthDate),
    });
  }

  /**
   * Create or update a budget for a given month.
   */
  async createOrUpdateBudget(data: CreateBudgetSchema | UpdateBudgetSchema) {
    if (!data.month) {
      throw new Error("month is required");
    }

    const monthDate = `${data.month}-01`;

    const existing = await db.query.budgets.findFirst({
      where: eq(budgets.month, monthDate),
    });

    if (existing) {
      const [updated] = await db
        .update(budgets)
        .set({
          ...(data.budgetAmount !== undefined && {
            budgetAmount: data.budgetAmount.toFixed(2),
          }),
          ...(data.categoryLimits !== undefined && {
            categoryLimits: data.categoryLimits,
          }),
        })
        .where(eq(budgets.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(budgets)
      .values({
        month: monthDate,
        budgetAmount: (data.budgetAmount ?? 0).toFixed(2),
        categoryLimits: data.categoryLimits ?? null,
      })
      .returning();
    return created;
  }

  /**
   * Calculate spending summary for a month: total spent, category breakdown,
   * compared against the budget.
   */
  async getSpendingSummary(month: string): Promise<BudgetSummary> {
    const budget = await this.getBudget(month);

    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get spending grouped by category
    const categorySpending = await db
      .select({
        category: items.category,
        spent: sql<string>`sum(${purchaseHistory.pricePaid}::numeric * ${purchaseHistory.quantity}::numeric)`,
      })
      .from(purchaseHistory)
      .innerJoin(items, eq(purchaseHistory.itemId, items.id))
      .where(
        and(
          gte(purchaseHistory.purchasedAt, startDate),
          lt(purchaseHistory.purchasedAt, endDate),
        ),
      )
      .groupBy(items.category);

    const totalSpent = categorySpending.reduce(
      (sum, row) => sum + Number(row.spent ?? 0),
      0,
    );
    const roundedTotal = Math.round(totalSpent * 100) / 100;

    const budgetAmount = budget ? Number(budget.budgetAmount) : 0;
    const categoryLimits =
      (budget?.categoryLimits as Record<string, number> | null) ?? {};

    const categoryBreakdown = categorySpending.map((row) => {
      const spent = Math.round(Number(row.spent ?? 0) * 100) / 100;
      const limit = categoryLimits[row.category] ?? null;
      return {
        category: row.category as BudgetSummary["categoryBreakdown"][number]["category"],
        spent,
        limit,
        percentUsed: limit ? Math.round((spent / limit) * 10000) / 100 : 0,
      };
    });

    return {
      month,
      budgetAmount,
      totalSpent: roundedTotal,
      remainingBudget: Math.round((budgetAmount - roundedTotal) * 100) / 100,
      percentUsed:
        budgetAmount > 0
          ? Math.round((roundedTotal / budgetAmount) * 10000) / 100
          : 0,
      categoryBreakdown,
      savingsFromSuggestions: 0,
    };
  }

  /**
   * Get spending totals per month for the last N months.
   */
  async getSpendingTrends(months: number): Promise<SpendingTrend> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const monthlySpending = await db
      .select({
        month: sql<string>`to_char(${purchaseHistory.purchasedAt}, 'YYYY-MM')`,
        totalSpent: sql<string>`sum(${purchaseHistory.pricePaid}::numeric * ${purchaseHistory.quantity}::numeric)`,
        itemCount: sql<string>`count(*)`,
      })
      .from(purchaseHistory)
      .where(
        and(
          gte(purchaseHistory.purchasedAt, startDate),
          lt(purchaseHistory.purchasedAt, endDate),
        ),
      )
      .groupBy(sql`to_char(${purchaseHistory.purchasedAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${purchaseHistory.purchasedAt}, 'YYYY-MM')`);

    // Fetch budgets for these months
    const budgetRows = await db
      .select()
      .from(budgets)
      .where(
        and(
          gte(budgets.month, `${startDate.toISOString().slice(0, 7)}-01`),
          lt(budgets.month, `${endDate.toISOString().slice(0, 7)}-01`),
        ),
      );

    const budgetMap = new Map(
      budgetRows.map((b) => [b.month.slice(0, 7), Number(b.budgetAmount)]),
    );

    return {
      months: monthlySpending.map((row) => ({
        month: row.month,
        totalSpent: Math.round(Number(row.totalSpent ?? 0) * 100) / 100,
        budgetAmount: budgetMap.get(row.month) ?? null,
        itemCount: Number(row.itemCount),
      })),
    };
  }
}
