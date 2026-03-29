import { env } from "../config/env";

export interface AmazonProduct {
  asin: string;
  title: string;
  price: number | null;
  listPrice: number | null;
  imageUrl: string | null;
  link: string;
  isPrime: boolean;
}

// Amazon PA API requires signing requests with AWS Signature V4
// For MVP, we'll use SerpAPI's Amazon engine as a simpler alternative
export async function searchAmazon(query: string): Promise<AmazonProduct[]> {
  if (!env.SERPAPI_KEY) return [];

  const params = new URLSearchParams({
    engine: "amazon",
    k: query,
    api_key: env.SERPAPI_KEY,
    amazon_domain: "amazon.com",
  });

  const response = await fetch(`https://serpapi.com/search.json?${params}`);

  if (!response.ok) {
    console.warn(`Amazon search via SerpAPI failed: ${response.status}`);
    return [];
  }

  const data = (await response.json()) as any;

  return (data.organic_results ?? []).slice(0, 10).map((item: any) => ({
    asin: item.asin ?? "",
    title: item.title ?? "",
    price: item.price?.raw ? parseFloat(item.price.raw.replace(/[^0-9.]/g, "")) : null,
    listPrice: item.price?.before_price?.raw ? parseFloat(item.price.before_price.raw.replace(/[^0-9.]/g, "")) : null,
    imageUrl: item.thumbnail ?? null,
    link: item.link ?? "",
    isPrime: item.is_prime ?? false,
  }));
}
