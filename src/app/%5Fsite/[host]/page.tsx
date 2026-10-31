import { notFound } from "next/navigation";
import { resolveSite } from "@/tenancy/resolve-site";

export const dynamic = "force-dynamic";

export default async function SitePage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const resolved = await resolveSite(decodeURIComponent(host));
  if (!resolved) notFound();
  return <main className="p-8">{resolved.product.name}</main>;
}
