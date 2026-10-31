import { getPanelUser, hasRole } from "@/auth/guard";
import { listAddonLinesByOrder, listOrders } from "@/admin/orders/queries";
import { parseOrderFilters } from "@/admin/orders/filters";
import { ORDER_STATUS_LABELS } from "@/orders/status";
import { formatTrPhone } from "@/orders/phone";

const PAYMENT = { cod_cash: "Kapıda nakit", cod_card: "Kapıda kart", online: "Online" } as const;
const cell = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const tl = (minor: number) => `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, "0")}`;

export async function GET(request: Request) {
  const user = await getPanelUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasRole(user.role, "admin")) return new Response("Forbidden", { status: 403 });
  const f = parseOrderFilters(new URL(request.url).searchParams, 10_000);
  f.page = 1;
  const { rows } = await listOrders(f);
  const addons = await listAddonLinesByOrder(rows.map((r) => r.id));
  const header = ["Sipariş no", "Tarih", "Site", "Ürün", "Paket", "Ek ürünler", "Müşteri", "Telefon", "İl", "İlçe", "Adres", "Ödeme", "Toplam (TL)", "Durum"];
  const lines = rows.map((r) => [
    r.orderNo, r.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }), r.siteHost, r.productName, r.offerLabel,
    addons.get(r.id) ?? "", r.customerName, formatTrPhone(r.phone), r.city, r.district, r.address, PAYMENT[r.paymentMethod],
    tl(r.grandTotalMinor), ORDER_STATUS_LABELS[r.status],
  ].map((v) => cell(String(v))).join(";"));
  const body = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="siparisler-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
