import { eq, and, desc, gte } from "drizzle-orm";
import { db } from "../db/index";
import { prices } from "../db/schema/prices";
import { items } from "../db/schema/items";
import { stores } from "../db/schema/stores";
import { searchProducts } from "../integrations/kroger";
import { searchWalmartProducts } from "../integrations/walmart";
import { searchGoogleShopping } from "../integrations/serpapi";
import { searchAmazon } from "../integrations/amazon";
import { StoreService } from "./store.service";
import { PreferencesService } from "./preferences.service";
import type { PriceComparison, BasketComparison, PriceTrend } from "@grocery/shared";

const CACHE_HOURS = 6;
const storeService = new StoreService();
const preferencesService = new PreferencesService();

// Default location IDs -- used when no specific store context is available
const DEFAULT_KROGER_LOCATION = "01400376";

export class PriceService {
  /**
   * Fetch prices from both Kroger and Walmart APIs for a given item,
   * insert price records into the DB, and return the inserted rows.
   */
  async fetchPricesForItem(itemId: string): Promise<Array<typeof prices.$inferSelect>> {
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const searchTerm = item.barcode ?? item.name;
    const inserted: Array<typeof prices.$inferSelect> = [];

    // Get user's zip code for location-based searches
    const prefs = await preferencesService.getPreferences();
    const zipCode = prefs?.zipCode ?? undefined;

    // Fetch from all APIs concurrently; failures are caught individually
    const [krogerResults, walmartResults, shoppingResults, amazonResults] = await Promise.all([
      searchProducts(searchTerm, DEFAULT_KROGER_LOCATION).catch((err) => {
        console.warn("Kroger API error:", err);
        return [];
      }),
      searchWalmartProducts(searchTerm).catch((err) => {
        console.warn("Walmart API error:", err);
        return [];
      }),
      searchGoogleShopping(searchTerm, zipCode).catch((err) => {
        console.warn("Google Shopping API error:", err);
        return [];
      }),
      searchAmazon(searchTerm).catch((err) => {
        console.warn("Amazon API error:", err);
        return [];
      }),
    ]);

    // Process Kroger results
    if (krogerResults.length > 0) {
      const best = krogerResults[0]!;
      if (best.price != null) {
        const store = await storeService.findOrCreateStore(
          "kroger",
          "Kroger",
          DEFAULT_KROGER_LOCATION,
        );

        const [row] = await db
          .insert(prices)
          .values({
            itemId,
            storeId: store.id,
            price: best.price.toFixed(2),
            salePrice: best.promoPrice != null ? best.promoPrice.toFixed(2) : null,
            isOnSale: best.promoPrice != null,
            source: "kroger_api",
          })
          .returning();

        inserted.push(row!);
      }
    }

    // Process Walmart results
    if (walmartResults.length > 0) {
      const best = walmartResults[0]!;
      const price = best.salePrice ?? best.msrp;
      if (price != null) {
        const store = await storeService.findOrCreateStore("walmart", "Walmart");

        const isOnSale = best.salePrice != null && best.msrp != null && best.salePrice < best.msrp;

        const [row] = await db
          .insert(prices)
          .values({
            itemId,
            storeId: store.id,
            price: price.toFixed(2),
            salePrice: isOnSale ? best.salePrice!.toFixed(2) : null,
            isOnSale,
            source: "walmart_api",
          })
          .returning();

        inserted.push(row!);
      }
    }

    // Process Google Shopping results: group by source (store) and take cheapest per store
    if (shoppingResults.length > 0) {
      const cheapestBySource = new Map<string, (typeof shoppingResults)[number]>();
      for (const result of shoppingResults) {
        if (result.price <= 0) continue;
        const existing = cheapestBySource.get(result.source);
        if (!existing || result.price < existing.price) {
          cheapestBySource.set(result.source, result);
        }
      }

      for (const [source, result] of cheapestBySource) {
        const chain = source.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const store = await storeService.findOrCreateStore(chain, source);

        const [row] = await db
          .insert(prices)
          .values({
            itemId,
            storeId: store.id,
            price: result.price.toFixed(2),
            salePrice: null,
            isOnSale: false,
            source: "google_shopping",
          })
          .returning();

        inserted.push(row!);
      }
    }

    // Process Amazon results
    if (amazonResults.length > 0) {
      const best = amazonResults.find((r) => r.price != null);
      if (best && best.price != null) {
        const store = await storeService.findOrCreateStore("amazon", "Amazon");

        const isOnSale =
          best.listPrice != null && best.price < best.listPrice;

        const [row] = await db
          .insert(prices)
          .values({
            itemId,
            storeId: store.id,
            price: best.price.toFixed(2),
            salePrice: isOnSale ? best.price.toFixed(2) : null,
            isOnSale,
            source: "amazon_api",
          })
          .returning();

        inserted.push(row!);
      }
    }

    return inserted;
  }

  /**
   * Get a PriceComparison for an item.
   * Uses cached prices if available within CACHE_HOURS, otherwise fetches fresh.
   */
  async getComparison(itemId: string): Promise<PriceComparison> {
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const cacheThreshold = new Date();
    cacheThreshold.setHours(cacheThreshold.getHours() - CACHE_HOURS);

    // Check for cached prices within the cache window
    const cached = await db
      .select({ price: prices, store: stores })
      .from(prices)
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(and(eq(prices.itemId, itemId), gte(prices.fetchedAt, cacheThreshold)))
      .orderBy(desc(prices.fetchedAt));

    // If no cached prices, fetch fresh
    if (cached.length === 0) {
      await this.fetchPricesForItem(itemId);
    }

    // Now retrieve all recent prices (whether just fetched or previously cached)
    const priceResults = await db
      .select({ price: prices, store: stores })
      .from(prices)
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(eq(prices.itemId, itemId))
      .orderBy(desc(prices.fetchedAt));

    // Deduplicate: keep latest price per store
    const latestPerStore = new Map<string, (typeof priceResults)[number]>();
    for (const row of priceResults) {
      if (!latestPerStore.has(row.store.id)) {
        latestPerStore.set(row.store.id, row);
      }
    }

    const priceEntries = Array.from(latestPerStore.values());
    const cheapest =
      priceEntries.length > 0
        ? priceEntries.reduce((min, curr) =>
            Number(curr.price.price) < Number(min.price.price) ? curr : min,
          )
        : null;

    return {
      item: {
        id: item.id,
        name: item.name,
        displayName: item.displayName,
      },
      prices: priceEntries.map((row) => ({
        store: {
          id: row.store.id,
          name: row.store.name,
          chain: row.store.chain,
        },
        price: Number(row.price.price),
        unitPrice: row.price.unitPrice ? Number(row.price.unitPrice) : null,
        isOnSale: row.price.isOnSale,
        salePrice: row.price.salePrice ? Number(row.price.salePrice) : null,
        fetchedAt: row.price.fetchedAt.toISOString(),
      })),
      cheapest: cheapest
        ? {
            storeId: cheapest.store.id,
            storeName: cheapest.store.name,
            price: Number(cheapest.price.price),
          }
        : null,
    };
  }

  /**
   * Compare total basket cost across stores for a list of items.
   */
  async getBasketComparison(itemIds: string[]): Promise<BasketComparison> {
    // Fetch comparisons for all items (uses cache where possible)
    const comparisons = await Promise.all(
      itemIds.map((id) => this.getComparison(id)),
    );

    // Build a map: storeId -> { store info, item prices }
    const storeMap = new Map<
      string,
      {
        store: { id: string; name: string };
        itemPrices: Map<string, number>;
      }
    >();

    for (const comp of comparisons) {
      for (const p of comp.prices) {
        if (!storeMap.has(p.store.id)) {
          storeMap.set(p.store.id, {
            store: { id: p.store.id, name: p.store.name },
            itemPrices: new Map(),
          });
        }
        const entry = storeMap.get(p.store.id)!;
        // Keep cheapest price for the item at this store
        const existing = entry.itemPrices.get(comp.item.id);
        if (existing === undefined || p.price < existing) {
          entry.itemPrices.set(comp.item.id, p.price);
        }
      }
    }

    // Build per-store totals
    const storeResults = Array.from(storeMap.values()).map((entry) => {
      const itemsMissing: string[] = [];
      let totalPrice = 0;
      let itemsAvailable = 0;

      for (const comp of comparisons) {
        const price = entry.itemPrices.get(comp.item.id);
        if (price !== undefined) {
          totalPrice += price;
          itemsAvailable++;
        } else {
          itemsMissing.push(comp.item.name);
        }
      }

      return {
        store: entry.store,
        totalPrice: Math.round(totalPrice * 100) / 100,
        itemsAvailable,
        itemsMissing,
      };
    });

    // Build split suggestion: pick cheapest store per item
    const splitStores = new Map<
      string,
      { storeId: string; storeName: string; items: string[]; subtotal: number }
    >();
    let splitTotal = 0;

    for (const comp of comparisons) {
      if (comp.cheapest) {
        const key = comp.cheapest.storeId;
        if (!splitStores.has(key)) {
          splitStores.set(key, {
            storeId: comp.cheapest.storeId,
            storeName: comp.cheapest.storeName,
            items: [],
            subtotal: 0,
          });
        }
        const entry = splitStores.get(key)!;
        entry.items.push(comp.item.name);
        entry.subtotal = Math.round((entry.subtotal + comp.cheapest.price) * 100) / 100;
        splitTotal += comp.cheapest.price;
      }
    }

    splitTotal = Math.round(splitTotal * 100) / 100;

    // Best single-store total (only stores with all items)
    const fullStores = storeResults.filter(
      (s) => s.itemsMissing.length === 0,
    );
    const bestSingleStore =
      fullStores.length > 0
        ? fullStores.reduce((min, curr) =>
            curr.totalPrice < min.totalPrice ? curr : min,
          )
        : null;

    const savingsVsBest = bestSingleStore
      ? Math.round((bestSingleStore.totalPrice - splitTotal) * 100) / 100
      : 0;

    return {
      stores: storeResults,
      splitSuggestion:
        splitStores.size > 1
          ? {
              stores: Array.from(splitStores.values()),
              totalPrice: splitTotal,
              savingsVsBest,
            }
          : null,
    };
  }

  /**
   * Get price history / trends for an item over a number of days.
   */
  async getPriceHistory(itemId: string, days: number): Promise<PriceTrend> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const history = await db
      .select({
        price: prices.price,
        storeId: prices.storeId,
        storeName: stores.name,
        source: prices.source,
        fetchedAt: prices.fetchedAt,
      })
      .from(prices)
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(and(eq(prices.itemId, itemId), gte(prices.fetchedAt, since)))
      .orderBy(desc(prices.fetchedAt));

    const priceValues = history.map((r) => Number(r.price));
    const average =
      priceValues.length > 0
        ? priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length
        : 0;
    const lowest = priceValues.length > 0 ? Math.min(...priceValues) : 0;
    const highest = priceValues.length > 0 ? Math.max(...priceValues) : 0;
    const current = priceValues.length > 0 ? priceValues[0]! : 0;

    let currentVsAverage: "above" | "below" | "at" = "at";
    if (current > average * 1.02) currentVsAverage = "above";
    else if (current < average * 0.98) currentVsAverage = "below";

    return {
      itemId,
      dataPoints: history.map((row) => ({
        date: row.fetchedAt.toISOString(),
        price: Number(row.price),
        storeId: row.storeId,
        storeName: row.storeName,
        source: row.source as PriceTrend["dataPoints"][number]["source"],
      })),
      averagePrice: Math.round(average * 100) / 100,
      lowestPrice: lowest,
      highestPrice: highest,
      currentVsAverage,
    };
  }
}
