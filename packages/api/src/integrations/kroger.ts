import { env } from "../config/env";

let accessToken: string | null = null;
let tokenExpiresAt = 0;

async function authenticate(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const credentials = Buffer.from(
    `${env.KROGER_CLIENT_ID}:${env.KROGER_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch("https://api.kroger.com/v1/connect/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });

  if (!response.ok) {
    throw new Error(`Kroger auth failed: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000; // refresh 1 min early

  return accessToken!;
}

export interface KrogerProduct {
  productId: string;
  upc: string;
  name: string;
  brand: string;
  price: number | null;
  promoPrice: number | null;
  imageUrl: string | null;
}

export async function searchProducts(
  query: string,
  locationId: string,
): Promise<KrogerProduct[]> {
  if (!env.KROGER_CLIENT_ID) return [];

  const token = await authenticate();

  const params = new URLSearchParams({
    "filter.term": query,
    "filter.locationId": locationId,
    "filter.limit": "10",
  });

  const response = await fetch(`https://api.kroger.com/v1/products?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!response.ok) {
    console.warn(`Kroger search failed: ${response.status}`);
    return [];
  }

  const data = await response.json();

  return (data.data ?? []).map((item: Record<string, unknown>) => ({
    productId: item.productId,
    upc: item.upc,
    name: item.description,
    brand: item.brand,
    price: (item as Record<string, Record<string, Record<string, number>>>).items?.[0]?.price?.regular ?? null,
    promoPrice: (item as Record<string, Record<string, Record<string, number>>>).items?.[0]?.price?.promo ?? null,
    imageUrl: (item as Record<string, Record<string, { url: string }[]>>).images?.[0]?.sizes?.find(
      (s: { size: string }) => s.size === "medium",
    )?.url ?? null,
  }));
}

export async function findNearbyStores(
  lat: number,
  lon: number,
  limit = 5,
): Promise<Array<{ locationId: string; name: string; address: string }>> {
  if (!env.KROGER_CLIENT_ID) return [];

  const token = await authenticate();

  const params = new URLSearchParams({
    "filter.lat.near": lat.toString(),
    "filter.lon.near": lon.toString(),
    "filter.limit": limit.toString(),
  });

  const response = await fetch(`https://api.kroger.com/v1/locations?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.data ?? []).map((store: Record<string, unknown>) => ({
    locationId: store.locationId,
    name: store.name,
    address: `${(store as Record<string, Record<string, string>>).address?.addressLine1}, ${(store as Record<string, Record<string, string>>).address?.city}, ${(store as Record<string, Record<string, string>>).address?.state}`,
  }));
}
