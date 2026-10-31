"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { Badge, Button, Select } from "@/components/ui";
import { changeStatus } from "@/admin/orders/actions";
import type { OrderRow } from "@/admin/orders/queries";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/orders/status";
import { formatTRY } from "@/lib/money";
import type { OrderStatus } from "@/db/schema";

const TONE: Partial<Record<OrderStatus, "green" | "yellow" | "red" | "blue" | "neutral">> = {
  yeni: "blue", onaylandi: "yellow", kargoda: "yellow", teslim_edildi: "green", iptal: "neutral", iade: "red", dogrulanmadi: "neutral",
};
const PAYMENT = { cod_cash: "Kapıda nakit", cod_card: "Kapıda kart", online: "Online" } as const;
const phone = (p: string) => p.replace(/^90(\d{3})(\d{3})(\d{2})(\d{2})$/, "0$1 $2 $3 $4");

const columns: ColumnDef<OrderRow, unknown>[] = [
  { header: "Sipariş", cell: ({ row: { original: o } }) => (
    <div><Link className="font-mono font-semibold underline-offset-2 hover:underline" href={`/admin/orders/${o.id}`}>{o.orderNo}</Link>
      <div className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" })}</div></div>
  ) },
  { header: "Müşteri", cell: ({ row: { original: o } }) => <div>{o.customerName}<div className="text-xs text-neutral-500">{phone(o.phone)}</div></div> },
  { header: "Adres", cell: ({ row: { original: o } }) => <div className="text-xs">{o.district} / {o.city}</div> },
  { header: "Ürün", cell: ({ row: { original: o } }) => <div>{o.productName}<div className="text-xs text-neutral-500">{o.offerLabel} · {o.siteHost}</div></div> },
  { header: "Ödeme", cell: ({ row: { original: o } }) => <div>{formatTRY(o.grandTotalMinor)}<div className="text-xs text-neutral-500">{PAYMENT[o.paymentMethod]}</div></div> },
  { header: "Durum", cell: ({ row: { original: o } }) => <Badge tone={TONE[o.status] ?? "neutral"}>{ORDER_STATUS_LABELS[o.status]}</Badge> },
];

export function OrdersTable({ rows, total, page, pageSize }: { rows: OrderRow[]; total: number; page: number; pageSize: number }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [to, setTo] = React.useState<OrderStatus>("onaylandi");
  const [msg, setMsg] = React.useState<string>();
  const [pending, start] = React.useTransition();
  const apply = () => start(async () => {
    const r = await changeStatus(selected.map(Number), to);
    setMsg(`${r.changed.length} sipariş güncellendi.${r.skipped.length ? ` ${r.skipped.length} sipariş atlandı: ${r.skipped.map((s) => s.reason).join(" ")}` : ""}`);
    router.refresh();
  });
  return (
    <div className="space-y-2">
      {msg && <p className="rounded bg-neutral-100 p-2 text-sm" role="status">{msg}</p>}
      <DataTable
        columns={columns} data={rows} total={total} page={page} pageSize={pageSize}
        getRowId={(r) => String(r.id)} onSelectionChange={setSelected} empty="Bu filtrelere uyan sipariş yok."
        bulkActions={
          <>
            <span className="text-sm">{selected.length} seçili →</span>
            <Select aria-label="Yeni durum" className="w-48" value={to} onChange={(e) => setTo(e.target.value as OrderStatus)}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
            </Select>
            <Button type="button" onClick={apply} disabled={pending}>Durumu değiştir</Button>
          </>
        }
      />
    </div>
  );
}
