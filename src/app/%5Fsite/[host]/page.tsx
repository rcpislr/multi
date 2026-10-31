import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { loadLanding } from "@/landing/load";
import { listCities } from "@/geo/tr";
import { OrderForm } from "@/components/landing/order-form";
import { StickyCta } from "@/components/landing/sticky-cta";
import {
  Announcement, BeforeAfter, Comparison, Faq, Footer, Gallery, Hero, IconCards, Marquee, Specs, Steps, UseCases,
} from "@/components/landing/sections";
import type { SectionKey } from "@/content/schema";

type Props = { params: Promise<{ host: string }>; searchParams: Promise<{ preview?: string }> };

async function load({ params, searchParams }: Props) {
  const [{ host }, { preview }] = await Promise.all([params, searchParams]);
  return loadLanding(decodeURIComponent(host), preview);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const r = await load(props);
  if (r?.kind !== "page") return {};
  return { title: r.model.content.hero.title || r.model.product.name, description: r.model.content.hero.subtitle, robots: r.preview ? { index: false } : undefined };
}

export default async function SitePage(props: Props) {
  const r = await load(props);
  if (!r) notFound();
  if (r.kind === "redirect") redirect(r.url);
  const { model, preview } = r;
  const c = model.content;
  const on = new Set<SectionKey>(c.enabledSections);
  return (
    <div style={{ ["--brand" as string]: c.theme.primaryColor }} className="min-h-screen bg-neutral-50 text-neutral-900">
      {preview && <div className="bg-yellow-300 px-4 py-1 text-center text-xs font-bold">ÖNİZLEME — site yayında değil</div>}
      {on.has("announcement") && <Announcement text={c.announcement} />}
      {on.has("marquee") && <Marquee items={c.marquee} />}
      {on.has("hero") && <Hero hero={c.hero} />}
      {on.has("problems") && <IconCards title="Tanıdık geldi mi?" items={c.problems} />}
      {on.has("features") && <IconCards title="Neden bu ürün?" items={c.features} />}
      {on.has("steps") && <Steps items={c.steps} />}
      {on.has("beforeAfter") && <BeforeAfter data={c.beforeAfter} />}
      <Gallery items={c.gallery} />
      {on.has("specs") && <Specs items={c.specs} />}
      {on.has("comparison") && <Comparison data={c.comparison} />}
      {on.has("useCases") && <UseCases items={c.useCases} />}
      {on.has("faq") && <Faq items={c.faq} />}
      <section id="siparis" className="mx-auto w-full max-w-xl scroll-mt-4 px-4 py-10">
        <h2 className="mb-6 text-center text-2xl font-extrabold">📦 Sipariş Formu</h2>
        <OrderForm model={model} cities={listCities()} />
      </section>
      <Footer business={model.business} />
      <StickyCta targetId="siparis" label="Sipariş Ver" />
    </div>
  );
}
