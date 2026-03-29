import { z } from "zod";

export const uploadReceiptSchema = z.object({
  imageUrl: z.string().url(),
  storeId: z.string().uuid().optional(),
  purchaseDate: z.string().optional(),
});

export const parsedLineItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  isSaleItem: z.boolean().default(false),
});

export const parsedReceiptDataSchema = z.object({
  storeName: z.string().nullable(),
  storeAddress: z.string().nullable(),
  date: z.string().nullable(),
  lineItems: z.array(parsedLineItemSchema),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number().nullable(),
});

export type UploadReceiptSchema = z.infer<typeof uploadReceiptSchema>;
