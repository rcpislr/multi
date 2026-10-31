import { describe, it, expect } from "vitest";
import { canonicalCity, canonicalDistrict, isValidCityDistrict, listDistricts } from "@/geo/tr";

describe("Turkish spelling variants", () => {
  it.each(["istanbul", "İSTANBUL", "Istanbul", "ISTANBUL"])("%s → İSTANBUL", (v) => expect(canonicalCity(v)).toBe("İSTANBUL"));
  it("ascii district", () => expect(canonicalDistrict("Istanbul", "Kadikoy")).toBe("KADIKÖY"));
  it("districts by ascii city", () => expect(listDistricts("Istanbul")).toContain("KADIKÖY"));
  it("izmir variants", () => expect(canonicalCity("Izmir")).toBe("İZMİR"));
  it("still rejects wrong pair", () => expect(isValidCityDistrict("Istanbul", "Cankaya")).toBe(false));
  it("unknown city", () => expect(canonicalCity("Yok")).toBeNull());
});
