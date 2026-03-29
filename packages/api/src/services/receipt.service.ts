import { eq } from "drizzle-orm";
import { analyzeImage } from "../integrations/claude";
import { db } from "../db/index";
import { receipts } from "../db/schema/receipts";
import type { ParsedReceiptData } from "@grocery/shared";

export class ReceiptService {
  async parseReceipt(imageUrl: string, receiptId: string): Promise<ParsedReceiptData> {
    const prompt = `Parse this grocery receipt image. Extract the following information:

1. "storeName": the store name
2. "storeAddress": store address if visible, or null
3. "date": purchase date in YYYY-MM-DD format, or null
4. "lineItems": array of items purchased, each with:
   - "name": item name (normalize to standard grocery terms, e.g., "BN CHICKEN BRST" → "boneless chicken breast")
   - "quantity": number of items (default 1)
   - "unitPrice": price per unit
   - "totalPrice": total for this line
   - "isSaleItem": true if the item was on sale/had a discount
5. "subtotal": pre-tax total, or null
6. "tax": tax amount, or null
7. "total": final total, or null

Return ONLY valid JSON with this structure. Normalize item names to be human-readable grocery terms.`;

    try {
      const response = await analyzeImage(imageUrl, prompt);
      const parsed: ParsedReceiptData = JSON.parse(response);

      // Update receipt record
      await db
        .update(receipts)
        .set({
          parsedData: parsed,
          total: parsed.total ? String(parsed.total) : null,
          tax: parsed.tax ? String(parsed.tax) : null,
          purchaseDate: parsed.date,
          status: "parsed",
        })
        .where(eq(receipts.id, receiptId));

      return parsed;
    } catch (error) {
      // Mark as failed
      await db.update(receipts).set({ status: "failed" }).where(eq(receipts.id, receiptId));
      throw error;
    }
  }
}
