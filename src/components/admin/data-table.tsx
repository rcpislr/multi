"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";

export function DataTable<T>({ columns, data, total, page, pageSize, filters, bulkActions, getRowId, onSelectionChange, empty = "Kayıt yok." }: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  filters?: React.ReactNode;
  bulkActions?: React.ReactNode;
  getRowId?: (row: T) => string;
  onSelectionChange?: (ids: string[]) => void;
  empty?: string;
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const table = useReactTable({
    data, columns, getRowId, getCoreRowModel: getCoreRowModel(),
    state: { rowSelection }, enableRowSelection: !!onSelectionChange,
    onRowSelectionChange: (u) => {
      const next = typeof u === "function" ? u(rowSelection) : u;
      setRowSelection(next);
      onSelectionChange?.(Object.keys(next).filter((k) => next[k]));
    },
  });
  const pathname = usePathname();
  const sp = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (p: number) => { const q = new URLSearchParams(sp.toString()); q.set("page", String(p)); return `${pathname}?${q}`; };

  return (
    <div className="space-y-3">
      {filters}
      {bulkActions && Object.values(rowSelection).some(Boolean) && <div className="flex items-center gap-2">{bulkActions}</div>}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {onSelectionChange && (
                  <th className="w-8 px-3 py-2">
                    <input type="checkbox" aria-label="Tümünü seç" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
                  </th>
                )}
                {hg.headers.map((h) => <th key={h.id} className="px-3 py-2 font-medium">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-neutral-500">{empty}</td></tr>
            )}
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                {onSelectionChange && (
                  <td className="px-3 py-2"><input type="checkbox" aria-label="Seç" checked={r.getIsSelected()} onChange={r.getToggleSelectedHandler()} /></td>
                )}
                {r.getVisibleCells().map((c) => <td key={c.id} className="px-3 py-2 align-top">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-neutral-600">
        <span>Toplam {total} kayıt</span>
        <div className="flex gap-2">
          {page > 1 && <Link className="rounded border px-2 py-1" href={hrefFor(page - 1)}>Önceki</Link>}
          <span className="px-2 py-1">{page} / {pages}</span>
          {page < pages && <Link className="rounded border px-2 py-1" href={hrefFor(page + 1)}>Sonraki</Link>}
        </div>
      </div>
    </div>
  );
}
