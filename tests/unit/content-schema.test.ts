import { describe, it, expect } from "vitest";
import { ProductContentSchema, emptyProductContent } from "@/content/schema";

describe("ProductContentSchema", () => {
  it("empty content is valid", () => expect(ProductContentSchema.safeParse(emptyProductContent()).success).toBe(true));
  it("rejects bad color", () => {
    const c = emptyProductContent();
    c.theme.primaryColor = "red";
    expect(ProductContentSchema.safeParse(c).success).toBe(false);
  });
  it("rejects unknown section", () => {
    expect(ProductContentSchema.safeParse({ ...emptyProductContent(), enabledSections: ["x"] }).success).toBe(false);
  });
});
