import { z } from "zod";

// Field names are fixed: the AI product wizard (Plan 4) fills exactly this shape.
export const SECTION_KEYS = [
  "announcement", "marquee", "hero", "problems", "features", "steps", "beforeAfter", "specs", "comparison", "useCases", "faq",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  announcement: "Üst duyuru", marquee: "Kayan bant", hero: "Hero", problems: "Sorunlar", features: "Özellikler",
  steps: "Nasıl kullanılır", beforeAfter: "Öncesi / sonrası", specs: "Teknik özellikler", comparison: "Karşılaştırma",
  useCases: "Kimler için, nerede kullanılır", faq: "Sıkça sorulan sorular",
};

const str = (max: number) => z.string().trim().max(max);
const IconCard = z.object({ icon: str(8), title: str(80), text: str(400) });

export const ProductContentSchema = z.object({
  enabledSections: z.array(z.enum(SECTION_KEYS)),
  announcement: str(160).optional(),
  marquee: z.array(str(80)).max(12),
  hero: z.object({
    title: str(120), subtitle: str(300), imageUrl: str(500).optional(), videoUrl: str(500).optional(), ctaLabel: str(40),
  }),
  problems: z.array(IconCard).max(8),
  features: z.array(IconCard).max(12),
  steps: z.array(z.object({ title: str(80), text: str(300) })).max(8),
  beforeAfter: z.object({
    beforeTitle: str(80), beforeItems: z.array(str(120)).max(8), afterTitle: str(80), afterItems: z.array(str(120)).max(8),
  }).optional(),
  specs: z.array(z.object({ label: str(60), value: str(120) })).max(20),
  comparison: z.object({
    ourLabel: str(40), otherLabel: str(40), rows: z.array(z.object({ label: str(80), ours: str(80), other: str(80) })).max(12),
  }).optional(),
  useCases: z.array(z.object({ title: str(80), text: str(300) })).max(8),
  faq: z.array(z.object({ q: str(200), a: str(1000) })).max(20),
  gallery: z.array(z.object({ url: str(500), alt: str(160) })).max(20),
  theme: z.object({ primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB biçiminde olmalı.") }),
});
export type ProductContent = z.infer<typeof ProductContentSchema>;

export function emptyProductContent(): ProductContent {
  return {
    enabledSections: ["hero", "features", "steps", "faq"],
    marquee: [],
    hero: { title: "", subtitle: "", ctaLabel: "Hemen Sipariş Ver" },
    problems: [], features: [], steps: [], specs: [], useCases: [], faq: [], gallery: [],
    theme: { primaryColor: "#E23E7B" },
  };
}
