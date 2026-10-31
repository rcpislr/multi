import { unstable_cache } from "next/cache";
import { resolveSite } from "@/tenancy/resolve-site";
import { listActiveOffers } from "@/admin/offers/store";
import { listActiveAddons } from "@/admin/addons/store";
import { getSettings } from "@/admin/settings/store";
import { buildLandingModel, type LandingModel } from "./model";
import { isValidPreviewToken } from "./preview";

export type LandingLoad = { kind: "page"; model: LandingModel; preview: boolean } | { kind: "redirect"; url: string } | null;

export async function loadLanding(host: string, previewTokenParam?: string): Promise<LandingLoad> {
  let resolved = await resolveSite(host);
  let preview = false;
  if (!resolved && previewTokenParam) {
    const draft = await resolveSite(host, { allowDraft: true });
    if (draft && isValidPreviewToken(draft.site.id, previewTokenParam)) { resolved = draft; preview = true; }
  }
  if (!resolved) return null;
  const { site, domain, product } = resolved;
  if (site.status === "yonlendir" && site.redirectUrl) return { kind: "redirect", url: site.redirectUrl };

  const build = () => Promise.all([listActiveOffers(product.id), listActiveAddons(product.id), getSettings()])
    .then(([offers, addons, settings]) => buildLandingModel({ site, domain, product, offers, addons, settings }));

  const model = preview
    ? await build()
    : await unstable_cache(build, ["landing", String(site.id)], {
        tags: [`site:${site.id}`, `product:${product.id}`, `domain:${domain.id}`, "settings"],
        revalidate: 3600,
      })();
  return { kind: "page", model, preview };
}
