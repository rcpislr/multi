import { describe, it, expect } from "vitest";
import { vatFromGross, formatTRY } from "@/lib/money";

describe("vatFromGross", () => {
  it("extracts vat from gross", () => expect(vatFromGross(59900, 20)).toBe(9983));
  it("zero gross", () => expect(vatFromGross(0, 20)).toBe(0));
});
describe("formatTRY", () => {
  it("whole lira", () => expect(formatTRY(59900)).toBe("599 ₺"));
  it("with kuruş", () => expect(formatTRY(59990)).toBe("599,90 ₺"));
  it("thousands separator", () => expect(formatTRY(120000)).toBe("1.200 ₺"));
});
