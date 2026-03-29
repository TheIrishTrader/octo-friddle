import { analyzeImage } from "../integrations/claude";
import type { DetectedFridgeItem } from "@grocery/shared";

interface FridgeAnalysis {
  detectedItems: DetectedFridgeItem[];
  missingItems: string[];
}

export class FridgeService {
  async analyzeFridge(imageUrl: string): Promise<FridgeAnalysis> {
    const prompt = `Analyze this photo of the inside of a refrigerator. For each item you can identify, provide:

1. "name": generic grocery name (e.g., "whole milk", "cheddar cheese")
2. "brand": brand name if visible, or null
3. "quantity": estimated amount remaining — one of: "full", "half", "low", "nearly_empty"
4. "category": one of: produce, dairy, meat, seafood, bakery, deli, frozen, canned, dry-goods, snacks, beverages, condiments, spices, breakfast, other
5. "confidence": 0.0 to 1.0

Also identify common staples that appear to be MISSING from this fridge (items most households keep that you don't see).

Return ONLY valid JSON with this structure:
{
  "detectedItems": [{"name": "...", "brand": null, "quantity": "full", "category": "dairy", "confidence": 0.9}],
  "missingItems": ["eggs", "butter"]
}`;

    const response = await analyzeImage(imageUrl, prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        detectedItems: parsed.detectedItems ?? [],
        missingItems: parsed.missingItems ?? [],
      };
    } catch {
      console.error("Failed to parse fridge analysis:", response);
      return { detectedItems: [], missingItems: [] };
    }
  }
}
