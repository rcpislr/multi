import { describe, it, expect } from "vitest";
import { listCities, listDistricts, isValidCityDistrict, trUpper } from "@/geo/tr";

describe("geo", () => {
  it("has 81 cities", () => expect(listCities()).toHaveLength(81));
  it("trUpper handles Turkish i", () => {
    expect(trUpper("istanbul")).toBe("İSTANBUL");
    expect(trUpper(" ızmır ")).toBe("IZMIR");
    expect(trUpper("izmir")).toBe("İZMİR");
  });
  it("collapses inner whitespace", () => expect(trUpper("kahraman   maraş")).toBe("KAHRAMAN MARAŞ"));
  it("matches city case-insensitively", () => expect(listDistricts("ankara")).toContain("ÇANKAYA"));
  it("unknown city has no districts", () => expect(listDistricts("YOK")).toBeNull());
  it("validates pairs", () => {
    expect(isValidCityDistrict("İstanbul", "Kadıköy")).toBe(true);
    expect(isValidCityDistrict("ANKARA", "KADIKÖY")).toBe(false);
    expect(isValidCityDistrict("YOK", "X")).toBe(false);
  });
});
