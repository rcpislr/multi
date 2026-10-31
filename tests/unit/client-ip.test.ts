import { describe, it, expect } from "vitest";
import { clientIp } from "@/lib/client-ip";

const h = (o: Record<string, string>) => new Headers(o);
describe("clientIp", () => {
  it("prefers cf-connecting-ip when behind Cloudflare", () =>
    expect(clientIp(h({ "cf-connecting-ip": "5.5.5.5", "x-forwarded-for": "1.1.1.1, 9.9.9.9" }), { trustCloudflare: true, proxyHops: 1 })).toBe("5.5.5.5"));
  it("ignores cf header when Cloudflare is not trusted", () =>
    expect(clientIp(h({ "cf-connecting-ip": "5.5.5.5", "x-forwarded-for": "1.1.1.1, 9.9.9.9" }), { trustCloudflare: false, proxyHops: 1 })).toBe("9.9.9.9"));
  it("takes the entry added by the trusted proxy, not the spoofable left-most one", () =>
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 2.2.2.2, 3.3.3.3" }), { trustCloudflare: false, proxyHops: 2 })).toBe("2.2.2.2"));
  it("falls back to x-real-ip then 0.0.0.0", () => {
    expect(clientIp(h({ "x-real-ip": "4.4.4.4" }), { trustCloudflare: false, proxyHops: 1 })).toBe("4.4.4.4");
    expect(clientIp(h({}), { trustCloudflare: false, proxyHops: 1 })).toBe("0.0.0.0");
  });
});
