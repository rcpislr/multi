import { normalizeHost } from "@/tenancy/host";
import { createOrder } from "@/orders/create-order";
import { clientIp, clientIpOptionsFromEnv } from "@/lib/client-ip";

const MAX_BYTES = 10_000;
const tooLarge = () => Response.json({ ok: false, code: "validation", fieldErrors: { form: "İstek çok büyük." } }, { status: 413 });

/** Reads at most MAX_BYTES of the body; null when it is larger. */
async function readLimited(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: Request) {
  const host = normalizeHost(request.headers.get("host") ?? "");
  const text = await readLimited(request);
  if (text === null) return tooLarge();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* validated below */ }
  const ip = clientIp(request.headers, clientIpOptionsFromEnv());
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
