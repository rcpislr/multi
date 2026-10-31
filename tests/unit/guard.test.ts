import { describe, it, expect } from "vitest";
import { hasRole } from "@/auth/guard";

describe("hasRole", () => {
  it("admin satisfies operator", () => expect(hasRole("admin", "operator")).toBe(true));
  it("operator does not satisfy admin", () => expect(hasRole("operator", "admin")).toBe(false));
  it("operator satisfies operator", () => expect(hasRole("operator", "operator")).toBe(true));
});
