import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/orders/route";

describe("POST /api/orders", () => {
  it("rejects an oversized body from Content-Length before reading it", async () => {
    const req = new Request("http://poset.localhost/api/orders", {
      method: "POST", headers: { host: "poset.localhost", "content-type": "application/json", "content-length": "50000" }, body: "{}",
    });
    expect((await POST(req)).status).toBe(413);
  });
  it("counts bytes, not characters", async () => {
    const big = JSON.stringify({ customerName: "ş".repeat(6000) }); // ~12 KB in UTF-8, 6k chars
    const req = new Request("http://poset.localhost/api/orders", { method: "POST", headers: { host: "poset.localhost", "content-type": "application/json" }, body: big });
    expect((await POST(req)).status).toBe(413);
  });
});
