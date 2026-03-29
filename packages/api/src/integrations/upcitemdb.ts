export interface UPCItemResult {
  name: string;
  displayName: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
}

export async function lookupUPC(barcode: string): Promise<UPCItemResult | null> {
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      {
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      console.warn(`UPCitemdb lookup failed for ${barcode}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];

    return {
      name: (item.title ?? "").toLowerCase().trim(),
      displayName: item.title ?? "",
      brand: item.brand ?? null,
      category: mapUPCCategory(item.category ?? ""),
      imageUrl: item.images?.[0] ?? null,
    };
  } catch (error) {
    console.error(`UPCitemdb lookup error for ${barcode}:`, error);
    return null;
  }
}

function mapUPCCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("dairy") || lower.includes("milk") || lower.includes("cheese")) return "dairy";
  if (lower.includes("meat") || lower.includes("poultry")) return "meat";
  if (lower.includes("produce") || lower.includes("fruit") || lower.includes("vegetable"))
    return "produce";
  if (lower.includes("frozen")) return "frozen";
  if (lower.includes("beverage") || lower.includes("drink")) return "beverages";
  if (lower.includes("snack")) return "snacks";
  if (lower.includes("bread") || lower.includes("bakery")) return "bakery";
  if (lower.includes("cereal") || lower.includes("breakfast")) return "breakfast";
  if (lower.includes("canned")) return "canned";
  if (lower.includes("condiment") || lower.includes("sauce")) return "condiments";
  if (lower.includes("spice") || lower.includes("seasoning")) return "spices";
  if (lower.includes("baby")) return "baby";
  if (lower.includes("pet")) return "pet";
  if (lower.includes("household") || lower.includes("cleaning")) return "household";
  if (lower.includes("personal") || lower.includes("health")) return "personal-care";
  return "other";
}
