import { listOrders, type OrderFilters, type OrderRow } from "./queries";

/** Every order matching the filters, read in batches so large exports are never cut off. */
export async function exportOrderRows(filters: Omit<OrderFilters, "page" | "pageSize"> & Partial<Pick<OrderFilters, "page" | "pageSize">>, batchSize = 1000): Promise<OrderRow[]> {
  const out: OrderRow[] = [];
  for (let page = 1; ; page++) {
    const { rows } = await listOrders({ ...filters, page, pageSize: batchSize });
    out.push(...rows);
    if (rows.length < batchSize) return out;
  }
}
