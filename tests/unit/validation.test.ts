import { describe, it, expect } from "vitest";
import { DomainNameSchema, SubdomainSchema } from "@/admin/validation";

describe("DomainNameSchema", () => {
  it.each(["localhost", "ornek.com", "Alan.COM.tr"])("accepts %s", (v) => expect(DomainNameSchema.safeParse(v).success).toBe(true));
  it.each(["", "ornek", "-a.com", "a..com", "http://a.com"])("rejects %s", (v) => expect(DomainNameSchema.safeParse(v).success).toBe(false));
  it("lowercases", () => expect(DomainNameSchema.parse("Alan.COM")).toBe("alan.com"));
});
describe("SubdomainSchema", () => {
  it.each(["poset", "mt", "masaj-tabancasi", "a1"])("accepts %s", (v) => expect(SubdomainSchema.safeParse(v).success).toBe(true));
  it.each(["panel", "www", "api", "admin", "-a", "a-", "a_b", "a.b", "ç", "a".repeat(64)])("rejects %s", (v) => expect(SubdomainSchema.safeParse(v).success).toBe(false));
});
