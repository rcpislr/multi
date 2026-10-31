import { normalizeHost } from "@/tenancy/host";
import { createOrder } from "@/orders/create-order";

const MAX_BODY = 10_000;

export async function POST(request: Request) {
  const host = normalizeHost(request.headers.get("host") ?? "");
  const text = await request.text();
  if (text.length > MAX_BODY) return Response.json({ ok: false, code: "validation", fieldErrors: { form: "İstek çok büyük." } }, { status: 413 });
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* validated below */ }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "0.0.0.0";
  const userAgent = request.headers.get("user-agent") ?? "";

  const r = await createOrder(host, body, { ip, userAgent });
  if (r.ok) return Response.json(r, { status: 201 });
  switch (r.code) {
    case "validation": return Response.json(r, { status: 422 });
    case "offer_changed": return Response.json(r, { status: 409 });
    case "not_found": return Response.json(r, { status: 404 });
    case "spam": return Response.json({ ok: true }, { status: 200 });
  }
}
