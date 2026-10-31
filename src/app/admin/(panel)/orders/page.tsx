import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireUser } from "@/auth/guard";
import { db } from "@/db/client";
import { domains, products, sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listOrders } from "@/admin/orders/queries";
import { parseOrderFilters } from "@/admin/orders/filters";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/orders/status";
import { Button, Input, Select } from "@/components/ui";
import { OrdersTable } from "./orders-table";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  const f = parseOrderFilters(sp);
  const [{ rows, total }, siteList, productList] = await Promise.all([
    listOrders(f),
    db.select({ id: sites.id, sub: sites.subdomain, domain: domains.name }).from(sites).innerJoin(domains, eq(domains.id, sites.domainId)).orderBy(asc(sites.subdomain)),
    db.select({ id: products.id, name: products.name }).from(products).orderBy(asc(products.name)),
  ]);
  const exportQs = new URLSearchParams(sp); exportQs.delete("page");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Siparişler</h1>
        {user.role === "admin" && <a className="text-sm underline" href={`/admin/orders/export?${exportQs}`}>CSV indir</a>}
      </div>
      <form method="get" className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-4 lg:grid-cols-8">
        <Input name="q" defaultValue={raw.q} placeholder="Ad, telefon veya sipariş no" aria-label="Ara" className="sm:col-span-2" />
        <Select name="site" defaultValue={raw.site ?? ""} aria-label="Site">
          <option value="">Tüm siteler</option>
          {siteList.map((s) => <option key={s.id} value={s.id}>{s.sub}.{s.domain}</option>)}
        </Select>
        <Select name="product" defaultValue={raw.product ?? ""} aria-label="Ürün">
          <option value="">Tüm ürünler</option>
          {productList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select name="status" defaultValue={raw.status ?? ""} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
        </Select>
        <Select name="payment" defaultValue={raw.payment ?? ""} aria-label="Ödeme">
          <option value="">Tüm ödemeler</option>
          <option value="cod_cash">Kapıda nakit</option><option value="cod_card">Kapıda kart</option><option value="online">Online</option>
        </Select>
        <Input type="date" name="from" defaultValue={raw.from} aria-label="Başlangıç tarihi" />
        <Input type="date" name="to" defaultValue={raw.to} aria-label="Bitiş tarihi" />
        <div className="flex gap-2 sm:col-span-4 lg:col-span-8">
          <Button type="submit">Filtrele</Button>
          <Link href="/admin/orders" className="px-3 py-2 text-sm text-neutral-600">Temizle</Link>
        </div>
      </form>
      <OrdersTable rows={rows} total={total} page={f.page} pageSize={f.pageSize} />
    </div>
  );
}
