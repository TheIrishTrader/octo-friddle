import { env } from "../config/env";

export interface WalmartProduct {
  itemId: string;
  name: string;
  brand: string | null;
  salePrice: number | null;
  msrp: number | null;
  imageUrl: string | null;
  upc: string | null;
}

export async function searchWalmartProducts(query: string): Promise<WalmartProduct[]> {
  if (!env.WALMART_API_KEY) return [];

  const params = new URLSearchParams({
    query,
    numItems: "10",
  });

  const response = await fetch(`https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?${params}`, {
    headers: {
      "WM_SEC.ACCESS_TOKEN": env.WALMART_API_KEY,
      "WM_CONSUMER.CHANNEL.TYPE": "0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.warn(`Walmart search failed: ${response.status}`);
    return [];
  }

  const data = await response.json();

  return (data.items ?? []).map((item: Record<string, unknown>) => ({
    itemId: String(item.itemId),
    name: item.name as string,
    brand: (item.brandName as string) ?? null,
    salePrice: (item.salePrice as number) ?? null,
    msrp: (item.msrp as number) ?? null,
    imageUrl: (item.mediumImage as string) ?? null,
    upc: (item.upc as string) ?? null,
  }));
}
