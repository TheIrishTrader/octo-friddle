import type { NutritionData } from "@grocery/shared";

export async function lookupByBarcode(
  barcode: string,
): Promise<{ name: string; nutrition: NutritionData | null; imageUrl: string | null } | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    );

    if (!response.ok) return null;

     
    const data = (await response.json()) as any;

    if (data.status !== 1 || !data.product) return null;

    const product = data.product;
    const nutrients = product.nutriments ?? {};

    return {
      name: product.product_name ?? "",
      imageUrl: product.image_url ?? null,
      nutrition: {
        calories: nutrients["energy-kcal_100g"] ?? null,
        fat: nutrients.fat_100g ?? null,
        saturatedFat: nutrients["saturated-fat_100g"] ?? null,
        carbohydrates: nutrients.carbohydrates_100g ?? null,
        sugar: nutrients.sugars_100g ?? null,
        fiber: nutrients.fiber_100g ?? null,
        protein: nutrients.proteins_100g ?? null,
        sodium: nutrients.sodium_100g ?? null,
        servingSize: product.serving_size ?? null,
        allergens: product.allergens_tags ?? [],
      },
    };
  } catch (error) {
    console.error(`Open Food Facts lookup error for ${barcode}:`, error);
    return null;
  }
}
