import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
}

/** Signed token that lets a draft site be previewed on its own (cookie-less) host. */
export function previewToken(siteId: number): string {
  return createHmac("sha256", secret()).update(`preview:${siteId}`).digest("base64url").slice(0, 32);
}

export function isValidPreviewToken(siteId: number, token: string | undefined | null): boolean {
  if (!token) return false;
  const a = Buffer.from(previewToken(siteId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
