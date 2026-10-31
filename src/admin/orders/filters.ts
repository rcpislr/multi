import type { OrderStatus, PaymentMethod } from "@/db/schema";
import { ORDER_STATUSES } from "@/orders/status";
import type { OrderFilters } from "./queries";

/** Parses list filters from URL search params (shared by the list page and CSV export). */
export function parseOrderFilters(sp: URLSearchParams, pageSize = 50): OrderFilters {
  const int = (k: string) => { const n = Number(sp.get(k)); return Number.isInteger(n) && n > 0 ? n : undefined; };
  const date = (k: string, endOfDay = false) => {
    const v = sp.get(k);
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
    const d = new Date(`${v}T00:00:00+03:00`);
    if (endOfDay) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };
  const status = sp.get("status");
  const pm = sp.get("payment");
  return {
    siteId: int("site"), productId: int("product"),
    status: status && ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined,
    paymentMethod: pm === "cod_cash" || pm === "cod_card" || pm === "online" ? (pm as PaymentMethod) : undefined,
    from: date("from"), to: date("to", true), q: sp.get("q") ?? undefined,
    page: int("page") ?? 1, pageSize,
  };
}
