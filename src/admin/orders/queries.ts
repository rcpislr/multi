import { and, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { domains, offers, orderEvents, orderItems, orders, products, sites, type OrderStatus, type PaymentMethod } from "@/db/schema";
import { normalizeTrPhone } from "@/orders/phone";

export type OrderFilters = {
  siteId?: number; productId?: number; status?: OrderStatus; paymentMethod?: PaymentMethod;
  from?: Date; to?: Date; q?: string; page: number; pageSize: number;
};

export type OrderRow = {
  id: number; orderNo: string; createdAt: Date; siteHost: string; productName: string; offerLabel: string;
  customerName: string; phone: string; city: string; district: string; address: string;
  paymentMethod: PaymentMethod; status: OrderStatus; grandTotalMinor: number;
};

function where(f: OrderFilters): SQL | undefined {
  const c: SQL[] = [];
  if (f.siteId) c.push(eq(orders.siteId, f.siteId));
  if (f.productId) c.push(eq(orders.productId, f.productId));
  if (f.status) c.push(eq(orders.status, f.status));
  if (f.paymentMethod) c.push(eq(orders.paymentMethod, f.paymentMethod));
  if (f.from) c.push(gte(orders.createdAt, f.from));
  if (f.to) c.push(lt(orders.createdAt, f.to));
  const q = f.q?.trim();
  if (q) {
    const phone = normalizeTrPhone(q);
    if (phone) c.push(eq(orders.phone, phone));
    else c.push(or(eq(orders.orderNo, q.toUpperCase()), ilike(orders.customerName, `%${q.replace(/[%_\\]/g, "\\$&")}%`))!);
  }
  return c.length ? and(...c) : undefined;
}

export async function listOrders(f: OrderFilters): Promise<{ rows: OrderRow[]; total: number }> {
  const w = where(f);
  const [{ total }] = (await db.select({ total: sql<number>`count(*)::int` }).from(orders).where(w)) as [{ total: number }];
  const rows = await db.select({
    id: orders.id, orderNo: orders.orderNo, createdAt: orders.createdAt,
    siteHost: sql<string>`${sites.subdomain} || '.' || ${domains.name}`,
    productName: products.name, offerLabel: offers.label,
    customerName: orders.customerName, phone: orders.phone, city: orders.city, district: orders.district, address: orders.address,
    paymentMethod: orders.paymentMethod, status: orders.status, grandTotalMinor: orders.grandTotalMinor,
  }).from(orders)
    .innerJoin(sites, eq(sites.id, orders.siteId))
    .innerJoin(domains, eq(domains.id, sites.domainId))
    .innerJoin(products, eq(products.id, orders.productId))
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .where(w)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(f.pageSize).offset((f.page - 1) * f.pageSize);
  return { rows, total };
}

export async function getOrderDetail(id: number) {
  const [row] = await db.select({ order: orders, siteHost: sql<string>`${sites.subdomain} || '.' || ${domains.name}`, productName: products.name, offerLabel: offers.label })
    .from(orders)
    .innerJoin(sites, eq(sites.id, orders.siteId))
    .innerJoin(domains, eq(domains.id, sites.domainId))
    .innerJoin(products, eq(products.id, orders.productId))
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .where(eq(orders.id, id));
  if (!row) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(orderItems.id),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(desc(orderEvents.createdAt), desc(orderEvents.id)),
  ]);
  return { ...row, items, events };
}

export async function listAddonLinesByOrder(orderIds: number[]): Promise<Map<number, string>> {
  if (!orderIds.length) return new Map();
  const rows = await db.select({ orderId: orderItems.orderId, name: orderItems.productNameSnapshot, qty: orderItems.qty })
    .from(orderItems).where(and(eq(orderItems.lineType, "addon"), inArray(orderItems.orderId, orderIds)));
  const m = new Map<number, string>();
  for (const r of rows) m.set(r.orderId, [m.get(r.orderId), `${r.name} x${r.qty}`].filter(Boolean).join(", "));
  return m;
}
