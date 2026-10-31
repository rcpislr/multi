import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { products, type Product } from "@/db/schema";
import { ProductContentSchema, emptyProductContent, type ProductContent } from "@/content/schema";

export const ProductGeneralSchema = z.object({
  name: z.string().trim().min(1, "Ürün adı gerekli.").max(120),
  sku: z.string().trim().min(1, "SKU gerekli.").max(60),
  vatRate: z.number().int().min(0).max(100),
  costMinor: z.number().int().min(0),
  unitPriceMinor: z.number().int().min(1, "Tekli fiyat 0'dan büyük olmalı."),
  trackStock: z.boolean(),
  stockQty: z.number().int().min(0, "Stok negatif olamaz."),
  codFeeEnabled: z.boolean(),
  codFeeCashMinor: z.number().int().min(0),
  codFeeCardMinor: z.number().int().min(0),
  status: z.enum(["taslak", "aktif", "arsiv"]),
});
export type ProductGeneral = z.infer<typeof ProductGeneralSchema>;

export function productContent(p: Pick<Product, "content">): ProductContent {
  const parsed = ProductContentSchema.safeParse(p.content);
  return parsed.success ? parsed.data : emptyProductContent();
}

export async function listProducts(): Promise<Product[]> {
  return db.select().from(products).orderBy(asc(products.name));
}

export async function getProduct(id: number): Promise<Product | null> {
  const [p] = await db.select().from(products).where(eq(products.id, id));
  return p ?? null;
}

export async function insertProduct(input: Pick<ProductGeneral, "name" | "sku" | "unitPriceMinor" | "vatRate">): Promise<Product> {
  const content = emptyProductContent();
  content.hero.title = input.name;
  const [p] = await db.insert(products).values({ ...input, content, status: "taslak" }).returning();
  return p!;
}

export async function updateProductGeneralById(id: number, raw: ProductGeneral): Promise<Product> {
  const input = ProductGeneralSchema.parse(raw);
  const [p] = await db.update(products).set(input).where(eq(products.id, id)).returning();
  if (!p) throw new Error("Ürün bulunamadı.");
  return p;
}

export async function updateProductContentById(id: number, raw: unknown): Promise<Product> {
  const content = ProductContentSchema.parse(raw);
  const [p] = await db.update(products).set({ content }).where(eq(products.id, id)).returning();
  if (!p) throw new Error("Ürün bulunamadı.");
  return p;
}
