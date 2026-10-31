import Link from "next/link";
import { requireUser } from "@/auth/guard";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin/orders", label: "Siparişler" },
  { href: "/admin/products", label: "Ürünler" },
  { href: "/admin/sites", label: "Siteler" },
  { href: "/admin/domains", label: "Domainler", admin: true },
  { href: "/admin/settings", label: "Ayarlar", admin: true },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white p-4">
        <div className="mb-6 text-sm font-semibold">Satış Paneli</div>
        <nav className="space-y-1">
          {NAV.filter((n) => !n.admin || user.role === "admin").map((n) => (
            <Link key={n.href} href={n.href} className="block rounded px-2 py-1.5 text-sm hover:bg-neutral-100">{n.label}</Link>
          ))}
        </nav>
        <div className="mt-8 border-t pt-4 text-xs text-neutral-500">
          <div className="truncate">{user.email}</div>
          <div className="mb-2">{user.role === "admin" ? "Yönetici" : "Operatör"}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
