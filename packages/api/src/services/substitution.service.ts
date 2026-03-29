import { eq, and, lt, ne, asc, sql } from "drizzle-orm";
import { db } from "../db/index";
import { items } from "../db/schema/items";
import { prices } from "../db/schema/prices";
import { stores } from "../db/schema/stores";
import { listItems } from "../db/schema/lists";
import type { Substitution, SubstitutionOption } from "@grocery/shared";

const STORE_BRAND_PATTERNS = [
  "great value",
  "kirkland",
  "kroger",
  "365",
  "market pantry",
  "good & gather",
  "member's mark",
  "equate",
  "essential everyday",
];

function isStoreBrand(brand: string | null): boolean {
  if (!brand) return true;
  const lower = brand.toLowerCase();
  return STORE_BRAND_PATTERNS.some((pattern) => lower.includes(pattern));
}

export class SubstitutionService {
  /**
   * For a given item, find cheaper alternatives in the same category.
   * Uses a single query with JOINs to find items in the same category
   * that have a lower cheapest price.
   */
  async getSubstitutions(itemId: string): Promise<Substitution> {
    // Get the original item and its cheapest current price
    const originalResult = await db
      .select({
        item: items,
        cheapestPrice: sql<string>`min(${prices.price})`.as("cheapest_price"),
      })
      .from(items)
      .innerJoin(prices, eq(items.id, prices.itemId))
      .where(eq(items.id, itemId))
      .groupBy(items.id);

    if (originalResult.length === 0) {
      // Item not found or has no prices — try to get item info alone
      const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
      });
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }
      return {
        originalItemId: item.id,
        originalItemName: item.displayName ?? item.name,
        originalPrice: 0,
        originalBrand: item.brand,
        suggestions: [],
      };
    }

    const original = originalResult[0]!;
    const originalPrice = Number(original.cheapestPrice);

    // Single efficient query: find all items in the same category with a
    // cheaper price, joined with their price and store info.
    // We use a subquery to get each item's minimum price, then filter.
    const cheaperAlternatives = await db
      .select({
        itemId: items.id,
        itemName: items.name,
        displayName: items.displayName,
        brand: items.brand,
        price: prices.price,
        storeId: stores.id,
        storeName: stores.name,
      })
      .from(items)
      .innerJoin(prices, eq(items.id, prices.itemId))
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(
        and(
          eq(items.category, original.item.category),
          ne(items.id, itemId),
          lt(prices.price, String(originalPrice)),
        ),
      )
      .orderBy(asc(prices.price));

    // Deduplicate: keep only the cheapest price per alternative item
    const bestPerItem = new Map<string, (typeof cheaperAlternatives)[number]>();
    for (const row of cheaperAlternatives) {
      const existing = bestPerItem.get(row.itemId);
      if (!existing || Number(row.price) < Number(existing.price)) {
        bestPerItem.set(row.itemId, row);
      }
    }

    const suggestions: SubstitutionOption[] = Array.from(bestPerItem.values()).map((row) => {
      const altPrice = Number(row.price);
      const savings = Math.round((originalPrice - altPrice) * 100) / 100;
      const savingsPercent =
        originalPrice > 0
          ? Math.round((savings / originalPrice) * 10000) / 100
          : 0;

      return {
        itemId: row.itemId,
        itemName: row.displayName ?? row.itemName,
        brand: row.brand,
        price: altPrice,
        savings,
        savingsPercent,
        storeId: row.storeId,
        storeName: row.storeName,
        isStoreBrand: isStoreBrand(row.brand),
      };
    });

    // Sort by highest savings first
    suggestions.sort((a, b) => b.savings - a.savings);

    return {
      originalItemId: original.item.id,
      originalItemName: original.item.displayName ?? original.item.name,
      originalPrice,
      originalBrand: original.item.brand,
      suggestions,
    };
  }

  /**
   * For all items in a list, find substitutions.
   * Filters out custom items (no itemId) and items with no cheaper alternatives.
   * Returns results sorted by highest savings first.
   */
  async getListSubstitutions(listId: string): Promise<Substitution[]> {
    // Get all list items that reference a catalog item
    const listEntries = await db
      .select({ itemId: listItems.itemId })
      .from(listItems)
      .where(eq(listItems.listId, listId));

    const itemIds = listEntries
      .map((entry) => entry.itemId)
      .filter((id): id is string => id !== null);

    if (itemIds.length === 0) {
      return [];
    }

    // Get substitutions for each item concurrently
    const results = await Promise.all(
      itemIds.map((id) => this.getSubstitutions(id).catch(() => null)),
    );

    // Filter out nulls (errors) and items with no suggestions
    const substitutions = results.filter(
      (s): s is Substitution => s !== null && s.suggestions.length > 0,
    );

    // Sort by highest total potential savings (best suggestion per item)
    substitutions.sort((a, b) => {
      const aSavings = a.suggestions[0]?.savings ?? 0;
      const bSavings = b.suggestions[0]?.savings ?? 0;
      return bSavings - aSavings;
    });

    return substitutions;
  }
}
