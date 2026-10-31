import type { OrderStatus } from "@/db/schema";

export const ORDER_STATUSES: OrderStatus[] = [
  "dogrulama_bekliyor", "dogrulanmadi", "yeni", "onaylandi", "kargoda", "teslim_edildi", "iptal", "iade",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  dogrulama_bekliyor: "Doğrulama bekliyor", dogrulanmadi: "Doğrulanmadı", yeni: "Yeni", onaylandi: "Onaylandı",
  kargoda: "Kargoda", teslim_edildi: "Teslim edildi", iptal: "İptal", iade: "İade",
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  dogrulama_bekliyor: ["yeni", "dogrulanmadi", "iptal"],
  dogrulanmadi: ["yeni", "iptal"],
  yeni: ["onaylandi", "iptal"],
  onaylandi: ["kargoda", "iptal"],
  kargoda: ["teslim_edildi", "iade", "iptal"],
  teslim_edildi: ["iade"],
  iptal: [],
  iade: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}
