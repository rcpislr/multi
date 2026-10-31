import type { ProductContent } from "@/content/schema";
import type { BusinessInfo } from "@/db/schema";

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-6 text-center text-2xl font-extrabold tracking-tight sm:text-3xl">{children}</h2>
);
const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`mx-auto w-full max-w-xl px-4 py-10 ${className}`}>{children}</section>
);

export function Announcement({ text }: { text?: string }) {
  if (!text) return null;
  return <div className="bg-[var(--brand)] px-4 py-2 text-center text-sm font-semibold text-white">{text}</div>;
}

export function Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = items.join("  ·  ");
  return (
    <div className="overflow-hidden border-y border-black/5 bg-white py-2 text-sm font-semibold text-neutral-800">
      <div className="landing-marquee whitespace-nowrap">{row}  ·  {row}  ·  {row}</div>
    </div>
  );
}

export function Hero({ hero }: { hero: ProductContent["hero"] }) {
  return (
    <Wrap className="pt-8 text-center">
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{hero.title}</h1>
      {hero.subtitle && <p className="mt-3 text-base text-neutral-600">{hero.subtitle}</p>}
      {hero.videoUrl ? (
        <video className="mt-6 w-full rounded-2xl bg-neutral-100" src={hero.videoUrl} autoPlay muted loop playsInline preload="metadata" />
      ) : hero.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="mt-6 w-full rounded-2xl bg-neutral-100 object-cover" src={hero.imageUrl} alt={hero.title} fetchPriority="high" />
      ) : null}
      <a href="#siparis" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--brand)] px-6 py-4 text-lg font-bold text-white shadow-lg shadow-black/10">
        {hero.ctaLabel || "Hemen Sipariş Ver"}
      </a>
    </Wrap>
  );
}

export function IconCards({ title, items }: { title: string; items: ProductContent["features"] }) {
  if (!items.length) return null;
  return (
    <Wrap>
      <H2>{title}</H2>
      <div className="grid gap-3">
        {items.map((f, i) => (
          <div key={i} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            {f.icon && <div className="text-2xl" aria-hidden>{f.icon}</div>}
            <div><div className="font-bold">{f.title}</div><p className="mt-1 text-sm text-neutral-600">{f.text}</p></div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

export function Steps({ items }: { items: ProductContent["steps"] }) {
  if (!items.length) return null;
  return (
    <Wrap>
      <H2>Nasıl kullanılır?</H2>
      <ol className="grid gap-3">
        {items.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] font-bold text-white">{i + 1}</span>
            <div><div className="font-bold">{s.title}</div><p className="mt-1 text-sm text-neutral-600">{s.text}</p></div>
          </li>
        ))}
      </ol>
    </Wrap>
  );
}

export function BeforeAfter({ data }: { data?: ProductContent["beforeAfter"] }) {
  if (!data) return null;
  return (
    <Wrap>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-neutral-100 p-4">
          <div className="mb-2 font-bold text-neutral-700">{data.beforeTitle}</div>
          <ul className="space-y-1 text-sm text-neutral-600">{data.beforeItems.map((x, i) => <li key={i}>✕ {x}</li>)}</ul>
        </div>
        <div className="rounded-2xl bg-[var(--brand)]/10 p-4">
          <div className="mb-2 font-bold">{data.afterTitle}</div>
          <ul className="space-y-1 text-sm">{data.afterItems.map((x, i) => <li key={i}>✓ {x}</li>)}</ul>
        </div>
      </div>
    </Wrap>
  );
}

export function Specs({ items }: { items: ProductContent["specs"] }) {
  if (!items.length) return null;
  return (
    <Wrap>
      <H2>Teknik özellikler</H2>
      <dl className="divide-y overflow-hidden rounded-2xl bg-white text-sm ring-1 ring-black/5">
        {items.map((s, i) => (
          <div key={i} className="flex justify-between gap-4 px-4 py-3"><dt className="text-neutral-500">{s.label}</dt><dd className="text-right font-semibold">{s.value}</dd></div>
        ))}
      </dl>
    </Wrap>
  );
}

export function Comparison({ data }: { data?: ProductContent["comparison"] }) {
  if (!data?.rows.length) return null;
  return (
    <Wrap>
      <H2>Karşılaştırma</H2>
      <table className="w-full overflow-hidden rounded-2xl bg-white text-sm ring-1 ring-black/5">
        <thead><tr className="bg-neutral-50"><th className="p-3 text-left"></th><th className="p-3">{data.ourLabel}</th><th className="p-3 text-neutral-500">{data.otherLabel}</th></tr></thead>
        <tbody>{data.rows.map((r, i) => <tr key={i} className="border-t"><td className="p-3">{r.label}</td><td className="p-3 text-center font-semibold">{r.ours}</td><td className="p-3 text-center text-neutral-500">{r.other}</td></tr>)}</tbody>
      </table>
    </Wrap>
  );
}

export function UseCases({ items }: { items: ProductContent["useCases"] }) {
  if (!items.length) return null;
  return (
    <Wrap>
      <H2>Kimler için, nerede kullanılır?</H2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((u, i) => <div key={i} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="font-bold">{u.title}</div><p className="mt-1 text-sm text-neutral-600">{u.text}</p></div>)}
      </div>
    </Wrap>
  );
}

export function Faq({ items }: { items: ProductContent["faq"] }) {
  if (!items.length) return null;
  return (
    <Wrap>
      <H2>Sıkça sorulan sorular</H2>
      <div className="space-y-2">
        {items.map((f, i) => (
          <details key={i} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-sm text-neutral-600">{f.a}</p>
          </details>
        ))}
      </div>
    </Wrap>
  );
}

export function Gallery({ items }: { items: ProductContent["gallery"] }) {
  if (!items.length) return null;
  return (
    <Wrap>
      <div className="grid grid-cols-2 gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {items.map((g, i) => <img key={i} src={g.url} alt={g.alt} loading="lazy" className="aspect-square w-full rounded-xl bg-neutral-100 object-cover" />)}
      </div>
    </Wrap>
  );
}

export function Footer({ business }: { business: BusinessInfo }) {
  return (
    <footer className="mt-10 border-t bg-white px-4 py-8 pb-28 text-center text-xs text-neutral-500">
      {business.legalName && <div className="font-semibold text-neutral-700">{business.legalName}</div>}
      {business.address && <div className="mt-1">{business.address}</div>}
      <div className="mt-1">{[business.phone, business.email].filter(Boolean).join(" · ")}</div>
      {(business.taxOffice || business.taxNo) && <div className="mt-1">{business.taxOffice} {business.taxNo && `VKN ${business.taxNo}`}</div>}
    </footer>
  );
}
