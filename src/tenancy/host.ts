export type Route =
  | { kind: "panel" }
  | { kind: "site"; rewrite: string }
  | { kind: "passthrough" }
  | { kind: "notfound" }
  | { kind: "to-panel" };

/** Hosts with no site on them (local dev): send the visitor to the panel instead of a 404. */
const BARE_HOSTS = ["localhost", "127.0.0.1"];

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
  const isPanel = h === normalizeHost(panelHost);
  if (BARE_HOSTS.includes(h)) return { kind: "to-panel" };
  // Auth endpoints exist only on the panel host.
  if (!isPanel && (pathname === "/api/auth" || pathname.startsWith("/api/auth/"))) return { kind: "notfound" };
  if (PASSTHROUGH_EXACT.includes(pathname) || PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return { kind: "passthrough" };
  }
  // internal site renderer must never be addressed directly
  if (pathname === "/_site" || pathname.startsWith("/_site/")) return { kind: "notfound" };
  if (isPanel) return { kind: "panel" };
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return { kind: "notfound" };
  return { kind: "site", rewrite: `/_site/${h}${pathname}` };
}
