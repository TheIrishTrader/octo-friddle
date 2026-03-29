import { analyzeImage } from "../integrations/claude";

interface IdentifiedItem {
  name: string;
  brand: string | null;
  category: string;
  confidence: number;
}

export class VisionService {
  async identifyItem(imageUrl: string): Promise<{ items: IdentifiedItem[] }> {
    const prompt = `Analyze this photo of a grocery item. Identify the product and return a JSON array of items you can see.

For each item:
1. "name": generic grocery name (e.g., "whole milk", "sourdough bread")
2. "brand": brand name if visible, or null
3. "category": one of: produce, dairy, meat, seafood, bakery, deli, frozen, canned, dry-goods, snacks, beverages, condiments, spices, breakfast, baby, household, personal-care, pet, other
4. "confidence": 0.0 to 1.0

Return ONLY valid JSON array, no other text. Example:
[{"name": "whole milk", "brand": "Horizon", "category": "dairy", "confidence": 0.95}]`;

    const response = await analyzeImage(imageUrl, prompt);

    try {
      const parsed = JSON.parse(response);
      return { items: Array.isArray(parsed) ? parsed : [] };
    } catch {
      console.error("Failed to parse vision response:", response);
      return { items: [] };
    }
  }
}
