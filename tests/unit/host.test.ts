import { describe, it, expect } from "vitest";
import { normalizeHost, routeForRequest } from "@/tenancy/host";

const P = "panel.localhost";
describe("normalizeHost", () => {
  it("lowercases and strips port", () => expect(normalizeHost("Poset.LocalHost:3000")).toBe("poset.localhost"));
  it("strips trailing dot", () => expect(normalizeHost("poset.localhost.")).toBe("poset.localhost"));
});
describe("routeForRequest", () => {
  it.each([
    ["panel.localhost:3000", "/admin/orders", { kind: "panel" }],
    ["panel.localhost:3000", "/", { kind: "panel" }],
    ["poset.localhost:3000", "/", { kind: "site", rewrite: "/_site/poset.localhost/" }],
    ["poset.localhost:3000", "/tesekkurler", { kind: "site", rewrite: "/_site/poset.localhost/tesekkurler" }],
    ["poset.localhost:3000", "/admin", { kind: "notfound" }],
    ["poset.localhost:3000", "/_site/other.localhost/", { kind: "notfound" }],
    ["poset.localhost:3000", "/api/orders", { kind: "passthrough" }],
    ["poset.localhost:3000", "/_next/static/x.js", { kind: "passthrough" }],
    ["panel.localhost:3000", "/_site/poset.localhost/", { kind: "notfound" }],
    ["poset.localhost:3000", "/api/auth/get-session", { kind: "notfound" }],
    ["localhost:3000", "/", { kind: "to-panel" }],
    ["localhost:3000", "/api/orders", { kind: "to-panel" }],
    ["panel.localhost:3000", "/api/auth/get-session", { kind: "passthrough" }],
  ])("%s %s", (host, path, expected) => expect(routeForRequest(host, path, P)).toEqual(expected));
});
