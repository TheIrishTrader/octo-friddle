import { eq, gte } from "drizzle-orm";
import { db } from "../db/index";
import { purchaseHistory } from "../db/schema/receipts";
import { items } from "../db/schema/items";
import { lists, listItems } from "../db/schema/lists";
import type { PurchasePattern, SmartSuggestion } from "@grocery/shared";

const PATTERN_LOOKBACK_DAYS = 90;
const MIN_PURCHASES = 2;
const MAX_CONFIDENCE_PURCHASES = 8;

export class SmartService {
  /**
   * Analyze purchase history to detect recurring buying patterns.
   * Requires at least 2 purchases within the last 90 days to establish a pattern.
   */
  async analyzePatterns(): Promise<PurchasePattern[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PATTERN_LOOKBACK_DAYS);

    // Get all purchases within the lookback window, grouped by item
    const rows = await db
      .select({
        itemId: purchaseHistory.itemId,
        itemName: items.name,
        purchasedAt: purchaseHistory.purchasedAt,
      })
      .from(purchaseHistory)
      .innerJoin(items, eq(purchaseHistory.itemId, items.id))
      .where(gte(purchaseHistory.purchasedAt, cutoff))
      .orderBy(purchaseHistory.itemId, purchaseHistory.purchasedAt);

    // Group purchases by item
    const grouped = new Map<string, { itemName: string; dates: Date[] }>();
    for (const row of rows) {
      const existing = grouped.get(row.itemId);
      if (existing) {
        existing.dates.push(row.purchasedAt);
      } else {
        grouped.set(row.itemId, {
          itemName: row.itemName,
          dates: [row.purchasedAt],
        });
      }
    }

    const now = new Date();
    const patterns: PurchasePattern[] = [];

    for (const [itemId, { itemName, dates }] of grouped) {
      // Need at least MIN_PURCHASES data points to establish a pattern
      if (dates.length < MIN_PURCHASES) {
        continue;
      }

      // Dates are already sorted by purchasedAt ascending
      // Calculate intervals between consecutive purchases
      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const diffMs = dates[i]!.getTime() - dates[i - 1]!.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        intervals.push(diffDays);
      }

      if (intervals.length === 0) {
        continue;
      }

      const averageDaysBetween =
        Math.round(
          (intervals.reduce((sum, d) => sum + d, 0) / intervals.length) * 10,
        ) / 10;

      const lastPurchased = dates[dates.length - 1]!;
      const daysSinceLastPurchase =
        Math.round(
          ((now.getTime() - lastPurchased.getTime()) / (1000 * 60 * 60 * 24)) * 10,
        ) / 10;

      const isOverdue = daysSinceLastPurchase > averageDaysBetween * 1.2;

      // Confidence: scales from 0.3 (2 purchases) up to 1.0 (MAX_CONFIDENCE_PURCHASES+)
      const confidence =
        Math.round(
          Math.min(1, 0.3 + (0.7 * (dates.length - MIN_PURCHASES)) / (MAX_CONFIDENCE_PURCHASES - MIN_PURCHASES)) * 100,
        ) / 100;

      patterns.push({
        itemId,
        itemName,
        averageDaysBetween,
        lastPurchased: lastPurchased.toISOString(),
        daysSinceLastPurchase,
        isOverdue,
        confidence,
        purchaseCount: dates.length,
      });
    }

    // Sort by confidence descending, then by overdue status
    patterns.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return b.confidence - a.confidence;
    });

    return patterns;
  }

  /**
   * Get smart suggestions for items to add to the grocery list.
   * Filters to overdue or approaching-due items, ranked by priority.
   */
  async getSuggestions(): Promise<SmartSuggestion[]> {
    const patterns = await this.analyzePatterns();

    const suggestions: SmartSuggestion[] = [];

    for (const pattern of patterns) {
      const overdueRatio = pattern.daysSinceLastPurchase / pattern.averageDaysBetween;

      let priority: SmartSuggestion["priority"];
      let reason: string;

      const avgDaysRounded = Math.round(pattern.averageDaysBetween);

      if (overdueRatio > 1.5) {
        priority = "high";
        const overdueDays = Math.round(
          pattern.daysSinceLastPurchase - pattern.averageDaysBetween,
        );
        reason = `You usually buy this every ${avgDaysRounded} days — you're ${overdueDays} days overdue`;
      } else if (overdueRatio > 1.2) {
        priority = "medium";
        reason = `You usually buy this every ${avgDaysRounded} days and it's time to restock`;
      } else if (overdueRatio > 0.8) {
        priority = "low";
        const daysLeft = Math.round(
          pattern.averageDaysBetween - pattern.daysSinceLastPurchase,
        );
        reason = `You usually buy this every ${avgDaysRounded} days — due in about ${daysLeft} days`;
      } else {
        // Not approaching due yet, skip
        continue;
      }

      suggestions.push({
        itemId: pattern.itemId,
        itemName: pattern.itemName,
        reason,
        priority,
        pattern,
      });
    }

    // Sort: high > medium > low, then by confidence
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return b.pattern.confidence - a.pattern.confidence;
    });

    return suggestions;
  }

  /**
   * Add suggested items to a shopping list with addedVia="smart_suggest".
   */
  async addSuggestionsToList(
    listId: string,
    itemIds: string[],
  ): Promise<{ added: number }> {
    // Verify list exists
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    });

    if (!list) {
      throw new Error("List not found");
    }

    // Get current max sort order
    const existingItems = await db.query.listItems.findMany({
      where: eq(listItems.listId, listId),
      orderBy: (items, { desc }) => [desc(items.sortOrder)],
      limit: 1,
    });

    let nextSortOrder = existingItems.length > 0 ? (existingItems[0]?.sortOrder ?? 0) + 1 : 0;

    const toInsert = itemIds.map((itemId) => ({
      listId,
      itemId,
      quantity: "1",
      addedVia: "smart_suggest" as const,
      sortOrder: nextSortOrder++,
    }));

    if (toInsert.length === 0) {
      return { added: 0 };
    }

    await db.insert(listItems).values(toInsert);

    // Update list timestamp
    await db
      .update(lists)
      .set({ updatedAt: new Date() })
      .where(eq(lists.id, listId));

    return { added: toInsert.length };
  }
}
