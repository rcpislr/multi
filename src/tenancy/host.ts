export type Route =
  | { kind: "panel" }
  | { kind: "site"; rewrite: string }
  | { kind: "passthrough" }
  | { kind: "notfound" };

export function normalizeHost(raw: string): string {
  let h = raw.trim().toLowerCase();
  const colon = h.lastIndexOf(":");
  if (colon !== -1 && !h.endsWith("]")) h = h.slice(0, colon);
  while (h.endsWith(".")) h = h.slice(0, -1);
  return h;
}

const PASSTHROUGH_PREFIXES = ["/api/", "/_next/"];
const PASSTHROUGH_EXACT = ["/api", "/favicon.ico", "/robots.txt"];

export function routeForRequest(host: string, pathname: string, panelHost: string): Route {
  const h = normalizeHost(host);
  if (PASSTHROUGH_EXACT.includes(pathname) || PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return { kind: "passthrough" };
  }
  // internal site renderer must never be addressed directly
  if (pathname === "/_site" || pathname.startsWith("/_site/")) return { kind: "notfound" };
  if (h === normalizeHost(panelHost)) return { kind: "panel" };
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return { kind: "notfound" };
  return { kind: "site", rewrite: `/_site/${h}${pathname}` };
}
