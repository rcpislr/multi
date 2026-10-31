import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, orders } from "@/db/schema";

/** Order summary for the customer-facing thank-you page, scoped to the site that took it. */
export async function getPublicOrder(siteId: number, token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.publicToken, token));
  if (!o || o.siteId !== siteId) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  return { order: o, items };
}
