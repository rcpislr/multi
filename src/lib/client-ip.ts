export type ClientIpOptions = { trustCloudflare: boolean; proxyHops: number };

export function clientIpOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): ClientIpOptions {
  const hops = Number(env.TRUSTED_PROXY_HOPS ?? "1");
  return { trustCloudflare: env.TRUSTED_PROXY === "cloudflare", proxyHops: Number.isInteger(hops) && hops >= 0 ? hops : 1 };
}

/**
 * Client IP that a client cannot spoof: Cloudflare's header when the origin only accepts Cloudflare,
 * otherwise the X-Forwarded-For entry appended by our own trusted proxy (counted from the right).
 */
export function clientIp(headers: Headers, opts: ClientIpOptions): string {
  if (opts.trustCloudflare) {
    const cf = headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  const xff = headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (xff.length && opts.proxyHops > 0) return xff[Math.max(0, xff.length - opts.proxyHops)]!;
  return headers.get("x-real-ip")?.trim() || "0.0.0.0";
}
