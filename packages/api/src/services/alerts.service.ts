import { eq, gte, and, desc } from "drizzle-orm";
import { db } from "../db/index";
import { items } from "../db/schema/items";
import { prices } from "../db/schema/prices";
import { stores } from "../db/schema/stores";
import { listItems } from "../db/schema/lists";
import type { PriceAlert } from "@grocery/shared";

const LOOKBACK_DAYS = 30;
const PRICE_DROP_THRESHOLD = 0.10; // 10% below average
const PRICE_SPIKE_THRESHOLD = 0.15; // 15% above average
const BUY_NOW_THRESHOLD = 0.05; // within 5% of 30-day low
const WAIT_PERCENTILE = 0.75; // top 25% of price range

const ALERT_PRIORITY: Record<PriceAlert["alertType"], number> = {
  price_drop: 0,
  buy_now: 1,
  sale: 2,
  wait: 3,
  price_spike: 4,
};

export class AlertsService {
  /**
   * Analyze price data for a single item and return relevant alerts.
   * Looks at the last 30 days of price data to detect drops, sales, spikes,
   * and buy-now / wait conditions.
   */
  async getAlertsForItem(itemId: string): Promise<PriceAlert[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

    // Get all prices from the last 30 days with store info
    const rows = await db
      .select({
        priceId: prices.id,
        price: prices.price,
        salePrice: prices.salePrice,
        isOnSale: prices.isOnSale,
        fetchedAt: prices.fetchedAt,
        storeId: stores.id,
        storeName: stores.name,
        itemName: items.name,
        displayName: items.displayName,
      })
      .from(prices)
      .innerJoin(items, eq(prices.itemId, items.id))
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(and(eq(prices.itemId, itemId), gte(prices.fetchedAt, cutoff)))
      .orderBy(desc(prices.fetchedAt));

    if (rows.length === 0) {
      return [];
    }

    const itemName = rows[0]!.displayName ?? rows[0]!.itemName;

    // Calculate stats across all prices in the window
    const allPrices = rows.map((r) => Number(r.price));
    const average = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
    const min30 = Math.min(...allPrices);
    const max30 = Math.max(...allPrices);
    const range = max30 - min30;
    const waitThreshold = range > 0 ? min30 + range * WAIT_PERCENTILE : max30;

    // Most recent price per store (the first occurrence of each store, since sorted desc by fetchedAt)
    const latestByStore = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByStore.has(row.storeId)) {
        latestByStore.set(row.storeId, row);
      }
    }

    const alerts: PriceAlert[] = [];

    for (const [, row] of latestByStore) {
      const currentPrice = Number(row.price);
      const pctFromAvg = (currentPrice - average) / average;

      // Sale detection (explicit flag in the data)
      if (row.isOnSale) {
        const regularPrice = row.salePrice ? Number(row.salePrice) : average;
        alerts.push({
          itemId,
          itemName,
          alertType: "sale",
          message: `On sale at ${row.storeName} for $${currentPrice.toFixed(2)} (reg $${regularPrice.toFixed(2)})`,
          currentPrice,
          referencePrice: Math.round(regularPrice * 100) / 100,
          storeName: row.storeName,
          storeId: row.storeId,
        });
      }

      // Price drop: current > 10% below average
      if (pctFromAvg < -PRICE_DROP_THRESHOLD) {
        const dropPct = Math.round(Math.abs(pctFromAvg) * 100);
        alerts.push({
          itemId,
          itemName,
          alertType: "price_drop",
          message: `Price dropped! $${currentPrice.toFixed(2)} is ${dropPct}% below average`,
          currentPrice,
          referencePrice: Math.round(average * 100) / 100,
          storeName: row.storeName,
          storeId: row.storeId,
        });
      }

      // Price spike: current > 15% above average
      if (pctFromAvg > PRICE_SPIKE_THRESHOLD) {
        const spikePct = Math.round(pctFromAvg * 100);
        alerts.push({
          itemId,
          itemName,
          alertType: "price_spike",
          message: `Price is ${spikePct}% above average - consider waiting`,
          currentPrice,
          referencePrice: Math.round(average * 100) / 100,
          storeName: row.storeName,
          storeId: row.storeId,
        });
      }

      // Buy now: current price is within 5% of the 30-day low
      if (min30 > 0 && currentPrice <= min30 * (1 + BUY_NOW_THRESHOLD)) {
        alerts.push({
          itemId,
          itemName,
          alertType: "buy_now",
          message: `Great time to buy - near 30-day low of $${min30.toFixed(2)}`,
          currentPrice,
          referencePrice: Math.round(min30 * 100) / 100,
          storeName: row.storeName,
          storeId: row.storeId,
        });
      }

      // Wait: current price is in the top 25% of the 30-day range
      // Only trigger if there IS a meaningful range and not already flagged as spike
      if (range > 0 && currentPrice >= waitThreshold && pctFromAvg <= PRICE_SPIKE_THRESHOLD) {
        alerts.push({
          itemId,
          itemName,
          alertType: "wait",
          message: `Price is high - you might save by waiting`,
          currentPrice,
          referencePrice: Math.round(average * 100) / 100,
          storeName: row.storeName,
          storeId: row.storeId,
        });
      }
    }

    // Sort by alert priority
    alerts.sort((a, b) => ALERT_PRIORITY[a.alertType] - ALERT_PRIORITY[b.alertType]);

    return alerts;
  }

  /**
   * Get price alerts for all items in a shopping list that have price data.
   * Returns alerts sorted by most actionable first.
   */
  async getAlertsForList(listId: string): Promise<PriceAlert[]> {
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

    // Get alerts for each item concurrently
    const results = await Promise.all(
      itemIds.map((id) => this.getAlertsForItem(id).catch(() => [])),
    );

    const allAlerts = results.flat();

    // Sort by alert priority
    allAlerts.sort((a, b) => ALERT_PRIORITY[a.alertType] - ALERT_PRIORITY[b.alertType]);

    return allAlerts;
  }

  /**
   * Find all items currently on sale across all stores.
   * Returns PriceAlert[] with alertType="sale".
   */
  async getActiveDeals(): Promise<PriceAlert[]> {
    const rows = await db
      .select({
        itemId: items.id,
        itemName: items.name,
        displayName: items.displayName,
        price: prices.price,
        salePrice: prices.salePrice,
        storeId: stores.id,
        storeName: stores.name,
      })
      .from(prices)
      .innerJoin(items, eq(prices.itemId, items.id))
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(eq(prices.isOnSale, true))
      .orderBy(desc(prices.fetchedAt));

    // Deduplicate: keep only the most recent sale entry per item+store combo
    const seen = new Set<string>();
    const alerts: PriceAlert[] = [];

    for (const row of rows) {
      const key = `${row.itemId}:${row.storeId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const currentPrice = Number(row.price);
      const regularPrice = row.salePrice ? Number(row.salePrice) : currentPrice;
      const name = row.displayName ?? row.itemName;

      alerts.push({
        itemId: row.itemId,
        itemName: name,
        alertType: "sale",
        message: `On sale at ${row.storeName} for $${currentPrice.toFixed(2)} (reg $${regularPrice.toFixed(2)})`,
        currentPrice,
        referencePrice: Math.round(regularPrice * 100) / 100,
        storeName: row.storeName,
        storeId: row.storeId,
      });
    }

    return alerts;
  }
}
