import { z } from "zod";
import { parseTRYInput } from "@/lib/money";

export const RESERVED_SUBDOMAINS = ["panel", "www", "api", "admin"];

export const DomainNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "localhost" || /^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/.test(v), "Geçerli bir alan adı girin (ör. ornek.com).");

export const SubdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Subdomain boş olamaz.")
  .max(63, "Subdomain en fazla 63 karakter olabilir.")
  .regex(/^[a-z0-9](-?[a-z0-9])*$/, "Sadece küçük harf, rakam ve tire kullanılabilir; tire başta/sonda olamaz.")
  .refine((v) => !RESERVED_SUBDOMAINS.includes(v), "Bu subdomain sistem tarafından ayrılmış.");

export const BusinessInfoSchema = z.object({
  legalName: z.string().trim().max(200).default(""),
  taxNo: z.string().trim().max(20).default(""),
  taxOffice: z.string().trim().max(100).default(""),
  address: z.string().trim().max(500).default(""),
  phone: z.string().trim().max(30).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Geçerli bir e-posta girin.")]).default(""),
  mersisNo: z.string().trim().max(30).optional(),
});
export type BusinessInfoInput = z.infer<typeof BusinessInfoSchema>;

/** Converts a TL text input into kuruş inside a Zod schema. */
export const MoneyInput = z.union([z.number().int(), z.string()]).transform((v, ctx) => {
  if (typeof v === "number") return v;
  const minor = parseTRYInput(v);
  if (minor === null) {
    ctx.addIssue({ code: "custom", message: "Geçerli bir tutar girin (ör. 49,90)." });
    return z.NEVER;
  }
  return minor;
}).pipe(z.number().int().min(0, "Tutar negatif olamaz."));

export type ActionResult = { ok: true; message?: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> };

export function zodFieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
