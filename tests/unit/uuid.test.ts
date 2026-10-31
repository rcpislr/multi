import { describe, it, expect } from "vitest";
import { uuidV4 } from "@/lib/uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
describe("uuidV4", () => {
  it("uses randomUUID when available", () => expect(uuidV4({ randomUUID: () => "x", getRandomValues: crypto.getRandomValues.bind(crypto) } as unknown as Crypto)).toBe("x"));
  it("falls back to getRandomValues (insecure context / old Safari)", () => {
    const c = { getRandomValues: crypto.getRandomValues.bind(crypto) } as unknown as Crypto;
    expect(uuidV4(c)).toMatch(V4);
  });
});
