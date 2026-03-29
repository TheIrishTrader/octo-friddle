import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { stores } from "../db/schema/stores";
import { findNearbyStores } from "../integrations/kroger";

export class StoreService {
  async findOrCreateStore(
    chain: string,
    name: string,
    apiStoreId?: string,
  ): Promise<typeof stores.$inferSelect> {
    // Try to find by apiStoreId first if provided
    if (apiStoreId) {
      const existing = await db.query.stores.findFirst({
        where: and(eq(stores.chain, chain), eq(stores.apiStoreId, apiStoreId)),
      });
      if (existing) return existing;
    }

    // Try to find by chain + name
    const existing = await db.query.stores.findFirst({
      where: and(eq(stores.chain, chain), eq(stores.name, name)),
    });
    if (existing) return existing;

    // Create new store
    const [created] = await db
      .insert(stores)
      .values({
        name,
        chain,
        apiStoreId: apiStoreId ?? null,
      })
      .returning();

    return created!;
  }

  async getNearbyStores(
    lat: number,
    lon: number,
  ): Promise<
    Array<{
      locationId: string;
      name: string;
      address: string;
      chain: string;
    }>
  > {
    const krogerStores = await findNearbyStores(lat, lon);

    return krogerStores.map((s) => ({
      locationId: s.locationId,
      name: s.name,
      address: s.address,
      chain: "kroger",
    }));
  }

  async getStores(): Promise<Array<typeof stores.$inferSelect>> {
    return db.query.stores.findMany();
  }
}
