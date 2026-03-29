import { lookupUPC } from "../integrations/upcitemdb";
import { lookupByBarcode as lookupOpenFoodFacts } from "../integrations/openfoodfacts";

interface BarcodeResult {
  name: string;
  displayName: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
}

export class BarcodeService {
  async lookup(barcode: string): Promise<BarcodeResult | null> {
    // Try UPCitemdb first
    const upcResult = await lookupUPC(barcode);
    if (upcResult) {
      return upcResult;
    }

    // Fallback to Open Food Facts
    const offResult = await lookupOpenFoodFacts(barcode);
    if (offResult && offResult.name) {
      return {
        name: offResult.name.toLowerCase().trim(),
        displayName: offResult.name,
        brand: null,
        category: "other",
        imageUrl: offResult.imageUrl,
      };
    }

    return null;
  }
}
