export interface Receipt {
  id: string;
  storeId: string | null;
  imageUrl: string;
  total: number | null;
  tax: number | null;
  purchaseDate: string | null;
  parsedData: ParsedReceiptData | null;
  status: ReceiptStatus;
  createdAt: string;
}

export type ReceiptStatus = "pending" | "processing" | "parsed" | "failed";

export interface ParsedReceiptData {
  storeName: string | null;
  storeAddress: string | null;
  date: string | null;
  lineItems: ParsedLineItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
}

export interface ParsedLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isSaleItem: boolean;
}

export interface PurchaseHistoryEntry {
  id: string;
  itemId: string;
  storeId: string;
  receiptId: string | null;
  pricePaid: number;
  quantity: number;
  unit: string | null;
  purchasedAt: string;
}

export interface FridgeScan {
  id: string;
  imageUrl: string;
  detectedItems: DetectedFridgeItem[];
  missingItems: string[];
  scannedAt: string;
}

export interface DetectedFridgeItem {
  name: string;
  brand: string | null;
  quantity: "full" | "half" | "low" | "nearly_empty";
  category: string;
  confidence: number;
}
