"use client";
import * as React from "react";
import { useFieldArray, useForm, type Control, type UseFormRegister } from "react-hook-form";
import { SECTION_KEYS, SECTION_LABELS, type ProductContent, type SectionKey } from "@/content/schema";
import { updateProductContent } from "@/admin/products/actions";
import { Button, Card, Input, Textarea } from "@/components/ui";

type FormValues = Omit<ProductContent, "marquee" | "beforeAfter" | "comparison"> & {
  marqueeText: string;
  beforeAfter: { beforeTitle: string; beforeItemsText: string; afterTitle: string; afterItemsText: string };
  comparison: NonNullable<ProductContent["comparison"]>;
};

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function toForm(c: ProductContent): FormValues {
  return {
    ...c,
    marqueeText: c.marquee.join("\n"),
    beforeAfter: {
      beforeTitle: c.beforeAfter?.beforeTitle ?? "", beforeItemsText: (c.beforeAfter?.beforeItems ?? []).join("\n"),
      afterTitle: c.beforeAfter?.afterTitle ?? "", afterItemsText: (c.beforeAfter?.afterItems ?? []).join("\n"),
    },
    comparison: c.comparison ?? { ourLabel: "Bizim ürün", otherLabel: "Diğerleri", rows: [] },
  };
}

function fromForm(v: FormValues): ProductContent {
  const { marqueeText, beforeAfter, comparison, ...rest } = v;
  const enabled = new Set(v.enabledSections);
  const ba = { beforeTitle: beforeAfter.beforeTitle, beforeItems: lines(beforeAfter.beforeItemsText), afterTitle: beforeAfter.afterTitle, afterItems: lines(beforeAfter.afterItemsText) };
  const baEmpty = !ba.beforeTitle && !ba.afterTitle && !ba.beforeItems.length && !ba.afterItems.length;
  return {
    ...rest,
    enabledSections: SECTION_KEYS.filter((k) => enabled.has(k)),
    announcement: v.announcement?.trim() || undefined,
    marquee: lines(marqueeText),
    hero: { ...v.hero, imageUrl: v.hero.imageUrl?.trim() || undefined, videoUrl: v.hero.videoUrl?.trim() || undefined },
    beforeAfter: enabled.has("beforeAfter") || !baEmpty ? ba : undefined,
    comparison: enabled.has("comparison") || comparison.rows.length ? comparison : undefined,
  };
}

type Col = { key: string; label: string; textarea?: boolean };

function ArrayEditor({ name, cols, control, register, addLabel, empty }: {
  name: "problems" | "features" | "steps" | "specs" | "useCases" | "faq" | "gallery" | "comparison.rows";
  cols: Col[]; control: Control<FormValues>; register: UseFormRegister<FormValues>; addLabel: string; empty: Record<string, string>;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: name as "faq" });
  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={f.id} className="flex items-start gap-2 rounded border p-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
            {cols.map((c) => {
              const path = `${name}.${i}.${c.key}` as "faq.0.q";
              return c.textarea
                ? <Textarea key={c.key} aria-label={c.label} placeholder={c.label} {...register(path)} />
                : <Input key={c.key} aria-label={c.label} placeholder={c.label} {...register(path)} />;
            })}
          </div>
          <div className="flex flex-col gap-1">
            <Button type="button" variant="ghost" aria-label="Yukarı" onClick={() => i > 0 && move(i, i - 1)}>↑</Button>
            <Button type="button" variant="ghost" aria-label="Sil" onClick={() => remove(i)}>✕</Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => append(empty as never)}>{addLabel}</Button>
    </div>
  );
}

function Section({ k, enabled, onToggle, children }: { k: SectionKey; enabled: boolean; onToggle: (on: boolean) => void; children: React.ReactNode }) {
  return (
    <Card className="space-y-3">
      <label className="flex items-center gap-2 font-medium">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} /> {SECTION_LABELS[k]}
      </label>
      <div className={enabled ? "" : "opacity-50"}>{children}</div>
    </Card>
  );
}

export function ContentEditor({ productId, initial }: { productId: number; initial: ProductContent }) {
  const { register, control, handleSubmit, watch, setValue } = useForm<FormValues>({ defaultValues: toForm(initial) });
  const [result, setResult] = React.useState<{ ok: boolean; text: string; errors?: Record<string, string> }>();
  const [pending, startTransition] = React.useTransition();
  const enabled = new Set(watch("enabledSections"));
  const toggle = (k: SectionKey) => (on: boolean) => {
    const next = new Set(enabled);
    if (on) next.add(k); else next.delete(k);
    setValue("enabledSections", SECTION_KEYS.filter((s) => next.has(s)), { shouldDirty: true });
  };
  const onSubmit = handleSubmit((v) => startTransition(async () => {
    const r = await updateProductContent(productId, fromForm(v));
    setResult(r.ok ? { ok: true, text: r.message ?? "Kaydedildi." } : { ok: false, text: r.error ?? "Bazı alanlar geçersiz.", errors: r.fieldErrors });
  }));
  const S = (k: SectionKey, children: React.ReactNode) => <Section k={k} enabled={enabled.has(k)} onToggle={toggle(k)}>{children}</Section>;
  const iconCols: Col[] = [{ key: "icon", label: "İkon (emoji)" }, { key: "title", label: "Başlık" }, { key: "text", label: "Metin", textarea: true }];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="flex items-center gap-3">
        <label htmlFor="theme-color" className="text-sm font-medium">Ana renk</label>
        <input id="theme-color" type="color" {...register("theme.primaryColor")} />
        <Input className="w-32" aria-label="Ana renk kodu" {...register("theme.primaryColor")} />
      </Card>
      {S("announcement", <Input aria-label="Duyuru metni" placeholder="🚚 2 ve üzeri pakette kargo ücretsiz" {...register("announcement")} />)}
      {S("marquee", <Textarea aria-label="Kayan bant satırları" placeholder="Her satır bir öğe" {...register("marqueeText")} />)}
      {S("hero", (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label="Başlık" placeholder="Başlık" {...register("hero.title")} />
          <Input aria-label="Buton metni" placeholder="Buton metni" {...register("hero.ctaLabel")} />
          <Textarea className="sm:col-span-2" aria-label="Alt başlık" placeholder="Alt başlık" {...register("hero.subtitle")} />
          <Input aria-label="Görsel adresi" placeholder="Görsel adresi (https://… veya /uploads/…)" {...register("hero.imageUrl")} />
          <Input aria-label="Video adresi" placeholder="Video adresi (.mp4)" {...register("hero.videoUrl")} />
        </div>
      ))}
      {S("problems", <ArrayEditor name="problems" cols={iconCols} control={control} register={register} addLabel="Sorun ekle" empty={{ icon: "", title: "", text: "" }} />)}
      {S("features", <ArrayEditor name="features" cols={iconCols} control={control} register={register} addLabel="Özellik ekle" empty={{ icon: "", title: "", text: "" }} />)}
      {S("steps", <ArrayEditor name="steps" cols={[{ key: "title", label: "Adım başlığı" }, { key: "text", label: "Açıklama", textarea: true }]} control={control} register={register} addLabel="Adım ekle" empty={{ title: "", text: "" }} />)}
      {S("beforeAfter", (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label="Öncesi başlığı" placeholder="Öncesi başlığı" {...register("beforeAfter.beforeTitle")} />
          <Input aria-label="Sonrası başlığı" placeholder="Sonrası başlığı" {...register("beforeAfter.afterTitle")} />
          <Textarea aria-label="Öncesi maddeleri" placeholder="Her satır bir madde" {...register("beforeAfter.beforeItemsText")} />
          <Textarea aria-label="Sonrası maddeleri" placeholder="Her satır bir madde" {...register("beforeAfter.afterItemsText")} />
        </div>
      ))}
      {S("specs", <ArrayEditor name="specs" cols={[{ key: "label", label: "Özellik" }, { key: "value", label: "Değer" }]} control={control} register={register} addLabel="Satır ekle" empty={{ label: "", value: "" }} />)}
      {S("comparison", (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input aria-label="Bizim etiket" placeholder="Bizim ürün" {...register("comparison.ourLabel")} />
            <Input aria-label="Diğer etiket" placeholder="Diğerleri" {...register("comparison.otherLabel")} />
          </div>
          <ArrayEditor name="comparison.rows" cols={[{ key: "label", label: "Kriter" }, { key: "ours", label: "Bizde" }, { key: "other", label: "Diğerlerinde" }]} control={control} register={register} addLabel="Satır ekle" empty={{ label: "", ours: "", other: "" }} />
        </div>
      ))}
      {S("useCases", <ArrayEditor name="useCases" cols={[{ key: "title", label: "Başlık" }, { key: "text", label: "Metin", textarea: true }]} control={control} register={register} addLabel="Kullanım alanı ekle" empty={{ title: "", text: "" }} />)}
      {S("faq", <ArrayEditor name="faq" cols={[{ key: "q", label: "Soru" }, { key: "a", label: "Cevap", textarea: true }]} control={control} register={register} addLabel="Soru ekle" empty={{ q: "", a: "" }} />)}
      <Card className="space-y-3">
        <div className="font-medium">Galeri</div>
        <ArrayEditor name="gallery" cols={[{ key: "url", label: "Görsel adresi" }, { key: "alt", label: "Açıklama (alt)" }]} control={control} register={register} addLabel="Görsel ekle" empty={{ url: "", alt: "" }} />
      </Card>
      {result && (
        <div role={result.ok ? "status" : "alert"} className={result.ok ? "rounded bg-green-50 p-2 text-sm text-green-700" : "rounded bg-red-50 p-2 text-sm text-red-700"}>
          {result.text}
          {result.errors && <ul className="mt-1 list-disc pl-5">{Object.entries(result.errors).map(([k, m]) => <li key={k}>{k}: {m}</li>)}</ul>}
        </div>
      )}
      <div className="sticky bottom-0 flex justify-end bg-neutral-50 py-3">
        <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "İçeriği kaydet"}</Button>
      </div>
    </form>
  );
}
