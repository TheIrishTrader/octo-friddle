import { env } from "../config/env";

export interface ShoppingResult {
  title: string;
  source: string; // store name e.g. "Amazon.com", "Target", "Kroger"
  price: number;
  link: string;
  thumbnail: string | null;
  rating: number | null;
  reviews: number | null;
}

export async function searchGoogleShopping(
  query: string,
  zipCode?: string,
): Promise<ShoppingResult[]> {
  if (!env.SERPAPI_KEY) return [];

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: env.SERPAPI_KEY,
    num: "20",
    gl: "us",
    hl: "en",
  });

  if (zipCode) {
    params.set("location", zipCode);
  }

  const response = await fetch(`https://serpapi.com/search.json?${params}`);

  if (!response.ok) {
    console.warn(`SerpAPI search failed: ${response.status}`);
    return [];
  }

  const data = (await response.json()) as any;

  return (data.shopping_results ?? []).map((item: any) => ({
    title: item.title ?? "",
    source: item.source ?? "Unknown",
    price: parsePrice(item.extracted_price ?? item.price),
    link: item.link ?? "",
    thumbnail: item.thumbnail ?? null,
    rating: item.rating ?? null,
    reviews: item.reviews ?? null,
  }));
}

function parsePrice(price: unknown): number {
  if (typeof price === "number") return price;
  if (typeof price === "string") {
    const cleaned = price.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  }
  return 0;
}
