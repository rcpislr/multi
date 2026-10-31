import { describe, it, expect } from "vitest";
import { normalizeTrPhone } from "@/orders/phone";

describe("normalizeTrPhone", () => {
  it.each([["5321234567"], ["05321234567"], ["0532 123 45 67"], ["+90 532 123 45 67"], ["905321234567"], ["(532) 123-45-67"], ["+90 (0532) 123 45 67"], ["0090 532 123 45 67"], ["00905321234567"]])(
    "%s", (raw) => expect(normalizeTrPhone(raw)).toBe("905321234567"));
  it.each([["1234"], ["4321234567"], ["053212345678"], [""], ["abc"]])("rejects %s", (raw) => expect(normalizeTrPhone(raw)).toBeNull());
});
