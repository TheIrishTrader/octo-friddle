import { eq, desc, inArray } from "drizzle-orm";
import { db } from "../db/index";
import { prices } from "../db/schema/prices";
import { items } from "../db/schema/items";
import { stores } from "../db/schema/stores";
import { listItems } from "../db/schema/lists";
import type {
  ShoppingRoute,
  ShoppingStop,
  RouteOptions,
} from "@grocery/shared";

/**
 * Haversine distance between two lat/lon points in miles.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface StoreInfo {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ItemPrice {
  itemId: string;
  itemName: string;
  price: number;
  isOnSale: boolean;
}

interface StoreWithPrices {
  store: StoreInfo;
  itemPrices: Map<string, ItemPrice>; // itemId -> best price
}

const AVG_SPEED_MPH = 30;

export class RouteService {
  /**
   * Get all stores that have prices for items in the given list,
   * along with a map of their item prices.
   */
  async getStoresWithPrices(
    listId: string,
  ): Promise<Map<string, StoreWithPrices>> {
    // Get all list items that reference a catalog item
    const listItemRows = await db
      .select({
        itemId: listItems.itemId,
      })
      .from(listItems)
      .where(eq(listItems.listId, listId));

    const itemIds = listItemRows
      .map((r) => r.itemId)
      .filter((id): id is string => id !== null);

    if (itemIds.length === 0) {
      return new Map();
    }

    // Get item names
    const itemRows = await db
      .select({ id: items.id, name: items.name })
      .from(items)
      .where(inArray(items.id, itemIds));

    const itemNameMap = new Map<string, string>();
    for (const row of itemRows) {
      itemNameMap.set(row.id, row.name);
    }

    // Get all prices for these items, joined with store info
    const priceRows = await db
      .select({
        itemId: prices.itemId,
        storeId: prices.storeId,
        price: prices.price,
        salePrice: prices.salePrice,
        isOnSale: prices.isOnSale,
        fetchedAt: prices.fetchedAt,
        storeName: stores.name,
        storeChain: stores.chain,
        storeAddress: stores.address,
        storeLat: stores.latitude,
        storeLon: stores.longitude,
      })
      .from(prices)
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(inArray(prices.itemId, itemIds))
      .orderBy(desc(prices.fetchedAt));

    // Build store map, keeping only the latest (best) price per item per store
    const storeMap = new Map<string, StoreWithPrices>();

    for (const row of priceRows) {
      if (!storeMap.has(row.storeId)) {
        storeMap.set(row.storeId, {
          store: {
            id: row.storeId,
            name: row.storeName,
            chain: row.storeChain,
            address: row.storeAddress,
            latitude: row.storeLat ? Number(row.storeLat) : null,
            longitude: row.storeLon ? Number(row.storeLon) : null,
          },
          itemPrices: new Map(),
        });
      }

      const entry = storeMap.get(row.storeId)!;
      // Keep the first (latest by fetchedAt) price per item at this store
      if (!entry.itemPrices.has(row.itemId)) {
        const effectivePrice = row.isOnSale && row.salePrice
          ? Number(row.salePrice)
          : Number(row.price);
        entry.itemPrices.set(row.itemId, {
          itemId: row.itemId,
          itemName: itemNameMap.get(row.itemId) ?? "Unknown",
          price: effectivePrice,
          isOnSale: row.isOnSale,
        });
      }
    }

    return storeMap;
  }

  /**
   * Calculate distance between two points. If either lacks coordinates, returns null.
   */
  private calcDistance(
    lat1: number | null | undefined,
    lon1: number | null | undefined,
    lat2: number | null | undefined,
    lon2: number | null | undefined,
  ): number | null {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return null;
    }
    return haversineDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Calculate travel cost for a given distance in miles.
   */
  private travelCost(
    distanceMiles: number | null,
    options: RouteOptions,
  ): number {
    if (distanceMiles == null) return 0;
    const gasCost = (distanceMiles / options.mpg) * options.gasPricePerGallon;
    const timeCost =
      (distanceMiles / AVG_SPEED_MPH) * 60 * options.minuteValue;
    return gasCost + timeCost;
  }

  /**
   * Calculate travel time in minutes for a given distance.
   */
  private travelTimeMinutes(distanceMiles: number | null): number | null {
    if (distanceMiles == null) return null;
    return (distanceMiles / AVG_SPEED_MPH) * 60;
  }

  /**
   * Compute the total route travel distance for visiting a sequence of stores,
   * starting from the user's location (if provided).
   */
  private routeTotalDistance(
    storeInfos: StoreInfo[],
    options: RouteOptions,
  ): { totalDistance: number; legs: (number | null)[] } {
    let totalDistance = 0;
    const legs: (number | null)[] = [];
    let prevLat: number | null | undefined = options.userLat;
    let prevLon: number | null | undefined = options.userLon;

    for (const store of storeInfos) {
      const d = this.calcDistance(prevLat, prevLon, store.latitude, store.longitude);
      legs.push(d);
      if (d != null) totalDistance += d;
      prevLat = store.latitude;
      prevLon = store.longitude;
    }

    return { totalDistance, legs };
  }

  /**
   * Given a set of stores and an assignment of items to stores, build a ShoppingRoute.
   */
  private buildRoute(
    storeAssignments: Map<string, { store: StoreInfo; items: ItemPrice[] }>,
    _allItemIds: string[],
    options: RouteOptions,
    worstSingleStoreTotal: number,
  ): ShoppingRoute {
    const storeList = Array.from(storeAssignments.values()).filter(
      (s) => s.items.length > 0,
    );

    if (storeList.length === 0) {
      return {
        stops: [],
        totalProductCost: 0,
        totalTravelCost: 0,
        totalCost: 0,
        estimatedTime: 0,
        totalDistance: 0,
        savings: 0,
      };
    }

    const storeInfos = storeList.map((s) => s.store);
    const { totalDistance, legs } = this.routeTotalDistance(storeInfos, options);
    const totalTravelCost = this.travelCost(totalDistance, options);

    const stops: ShoppingStop[] = storeList.map((entry, idx) => {
      const subtotal = entry.items.reduce((sum, it) => sum + it.price, 0);
      const legDistance = legs[idx] ?? null;
      return {
        store: entry.store,
        items: entry.items.map((it) => ({
          itemId: it.itemId,
          itemName: it.itemName,
          price: it.price,
          isOnSale: it.isOnSale,
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        distanceFromPrevious: legDistance != null ? Math.round(legDistance * 100) / 100 : null,
        travelTimeFromPrevious: this.travelTimeMinutes(legDistance) != null
          ? Math.round(this.travelTimeMinutes(legDistance)! * 100) / 100
          : null,
      };
    });

    const totalProductCost = stops.reduce((sum, s) => sum + s.subtotal, 0);
    const totalCost = Math.round((totalProductCost + totalTravelCost) * 100) / 100;
    const estimatedTime = totalDistance > 0 ? (totalDistance / AVG_SPEED_MPH) * 60 : 0;
    const savings = Math.round((worstSingleStoreTotal - totalCost) * 100) / 100;

    return {
      stops,
      totalProductCost: Math.round(totalProductCost * 100) / 100,
      totalTravelCost: Math.round(totalTravelCost * 100) / 100,
      totalCost,
      estimatedTime: Math.round(estimatedTime * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      savings: Math.max(savings, 0),
    };
  }

  /**
   * Calculate the optimal shopping route for a list.
   */
  async calculateOptimalRoute(
    listId: string,
    options: RouteOptions,
  ): Promise<ShoppingRoute> {
    const storeMap = await this.getStoresWithPrices(listId);

    if (storeMap.size === 0) {
      return {
        stops: [],
        totalProductCost: 0,
        totalTravelCost: 0,
        totalCost: 0,
        estimatedTime: 0,
        totalDistance: 0,
        savings: 0,
      };
    }

    // Collect all item IDs across all stores
    const allItemIds = new Set<string>();
    for (const entry of storeMap.values()) {
      for (const itemId of entry.itemPrices.keys()) {
        allItemIds.add(itemId);
      }
    }

    const itemIdArray = Array.from(allItemIds);
    const storeEntries = Array.from(storeMap.entries());

    // ---- Evaluate single-store options ----
    let bestRoute: ShoppingRoute | null = null;
    let bestTotalCost = Infinity;

    // Track worst single-store total for savings calculation
    let worstSingleStoreTotal = 0;

    for (const [, entry] of storeEntries) {
      const storeItems: ItemPrice[] = [];
      for (const itemId of itemIdArray) {
        const ip = entry.itemPrices.get(itemId);
        if (ip) storeItems.push(ip);
      }
      if (storeItems.length === 0) continue;

      const productCost = storeItems.reduce((sum, it) => sum + it.price, 0);
      const { totalDistance } = this.routeTotalDistance([entry.store], options);
      const travelCost = this.travelCost(totalDistance, options);
      const totalCost = productCost + travelCost;

      if (totalCost > worstSingleStoreTotal) {
        worstSingleStoreTotal = totalCost;
      }
    }

    // Evaluate single-store options
    for (const [storeId, entry] of storeEntries) {
      const storeItems: ItemPrice[] = [];
      for (const itemId of itemIdArray) {
        const ip = entry.itemPrices.get(itemId);
        if (ip) storeItems.push(ip);
      }
      if (storeItems.length === 0) continue;

      const assignments = new Map<string, { store: StoreInfo; items: ItemPrice[] }>();
      assignments.set(storeId, { store: entry.store, items: storeItems });

      const route = this.buildRoute(assignments, itemIdArray, options, worstSingleStoreTotal);
      if (route.totalCost < bestTotalCost) {
        bestTotalCost = route.totalCost;
        bestRoute = route;
      }
    }

    // ---- Evaluate multi-store splits (2-store combos) ----
    if (options.maxStops >= 2 && storeEntries.length >= 2) {
      for (let i = 0; i < storeEntries.length; i++) {
        for (let j = i + 1; j < storeEntries.length; j++) {
          const [idA, entryA] = storeEntries[i]!;
          const [idB, entryB] = storeEntries[j]!;

          const assignA: ItemPrice[] = [];
          const assignB: ItemPrice[] = [];

          for (const itemId of itemIdArray) {
            const priceA = entryA.itemPrices.get(itemId);
            const priceB = entryB.itemPrices.get(itemId);

            if (priceA && priceB) {
              // Assign to cheaper store
              if (priceA.price <= priceB.price) {
                assignA.push(priceA);
              } else {
                assignB.push(priceB);
              }
            } else if (priceA) {
              assignA.push(priceA);
            } else if (priceB) {
              assignB.push(priceB);
            }
          }

          const assignments = new Map<string, { store: StoreInfo; items: ItemPrice[] }>();
          assignments.set(idA, { store: entryA.store, items: assignA });
          assignments.set(idB, { store: entryB.store, items: assignB });

          const route = this.buildRoute(assignments, itemIdArray, options, worstSingleStoreTotal);
          if (route.totalCost < bestTotalCost) {
            bestTotalCost = route.totalCost;
            bestRoute = route;
          }
        }
      }
    }

    // ---- Evaluate 3-store splits ----
    if (options.maxStops >= 3 && storeEntries.length >= 3) {
      for (let i = 0; i < storeEntries.length; i++) {
        for (let j = i + 1; j < storeEntries.length; j++) {
          for (let k = j + 1; k < storeEntries.length; k++) {
            const [idA, entryA] = storeEntries[i]!;
            const [idB, entryB] = storeEntries[j]!;
            const [idC, entryC] = storeEntries[k]!;

            const assignA: ItemPrice[] = [];
            const assignB: ItemPrice[] = [];
            const assignC: ItemPrice[] = [];

            for (const itemId of itemIdArray) {
              const pA = entryA.itemPrices.get(itemId);
              const pB = entryB.itemPrices.get(itemId);
              const pC = entryC.itemPrices.get(itemId);

              const candidates: { price: ItemPrice; list: ItemPrice[] }[] = [];
              if (pA) candidates.push({ price: pA, list: assignA });
              if (pB) candidates.push({ price: pB, list: assignB });
              if (pC) candidates.push({ price: pC, list: assignC });

              if (candidates.length > 0) {
                const best = candidates.reduce((min, curr) =>
                  curr.price.price < min.price.price ? curr : min,
                );
                best.list.push(best.price);
              }
            }

            const assignments = new Map<string, { store: StoreInfo; items: ItemPrice[] }>();
            assignments.set(idA, { store: entryA.store, items: assignA });
            assignments.set(idB, { store: entryB.store, items: assignB });
            assignments.set(idC, { store: entryC.store, items: assignC });

            const route = this.buildRoute(assignments, itemIdArray, options, worstSingleStoreTotal);
            if (route.totalCost < bestTotalCost) {
              bestTotalCost = route.totalCost;
              bestRoute = route;
            }
          }
        }
      }
    }

    return bestRoute ?? {
      stops: [],
      totalProductCost: 0,
      totalTravelCost: 0,
      totalCost: 0,
      estimatedTime: 0,
      totalDistance: 0,
      savings: 0,
    };
  }
}
