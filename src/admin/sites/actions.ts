"use server";
import { redirect } from "next/navigation";
import { invalidatePath as revalidatePath } from "@/lib/cache";
import { ZodError } from "zod";
import { requireUser } from "@/auth/guard";
import { invalidateTags } from "@/lib/cache";
import { fdInt, fdStr } from "@/admin/form-data";
import { zodFieldErrors, type ActionResult } from "@/admin/validation";
import { parseTRYInput } from "@/lib/money";
import type { Site } from "@/db/schema";
import { SiteError, getSiteWithDomain, insertSite, updateSiteById, type UpdateSiteInput } from "./store";

export async function createSite(input: { domainId: number; subdomain: string; productId: number }): Promise<Site> {
  await requireUser("admin");
  return insertSite(input);
}

export async function updateSite(id: number, input: UpdateSiteInput): Promise<Site> {
  await requireUser("admin");
  const site = await updateSiteById(id, input);
  invalidateTags(`site:${id}`);
  return site;
}

function toResult(e: unknown): ActionResult {
  if (e instanceof ZodError) return { ok: false, fieldErrors: zodFieldErrors(e) };
  if (e instanceof SiteError) return { ok: false, error: e.message };
  throw e;
}

export async function createSiteForm(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let site: Site;
  try {
    site = await createSite({ domainId: fdInt(fd, "domainId"), subdomain: fdStr(fd, "subdomain"), productId: fdInt(fd, "productId") });
  } catch (e) { return toResult(e); }
  redirect(`/admin/sites/${site.id}`);
}

export async function updateSiteForm(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = fdInt(fd, "id");
  const priceOverrides: Record<string, number> = {};
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("price:") || !String(v).trim()) continue;
    const minor = parseTRYInput(String(v));
    if (minor === null) return { ok: false, fieldErrors: { [k]: "Geçerli bir tutar girin." } };
    priceOverrides[k.slice(6)] = minor;
  }
  // The form manages only hero/theme; keep every other override (e.g. per-site FAQ) as it is.
  const current = await getSiteWithDomain(id);
  if (!current) return { ok: false, error: "Site bulunamadı." };
  const { hero: _hero, theme: _theme, ...kept } = current.site.contentOverrides as Record<string, unknown>;
  const overrides: Record<string, unknown> = { ...kept };
  const heroTitle = fdStr(fd, "heroTitle"), heroSubtitle = fdStr(fd, "heroSubtitle"), heroImage = fdStr(fd, "heroImageUrl"), heroVideo = fdStr(fd, "heroVideoUrl");
  const hero = Object.fromEntries(Object.entries({ title: heroTitle, subtitle: heroSubtitle, imageUrl: heroImage, videoUrl: heroVideo }).filter(([, v]) => v));
  if (Object.keys(hero).length) overrides.hero = hero;
  const color = fdStr(fd, "primaryColor");
  if (color) overrides.theme = { primaryColor: color };
  try {
    await updateSite(id, {
      status: fdStr(fd, "status") as UpdateSiteInput["status"],
      redirectUrl: fdStr(fd, "redirectUrl") || null,
      metaPixelId: fdStr(fd, "metaPixelId") || null,
      metaCapiToken: fdStr(fd, "metaCapiToken") || null,
      contentOverrides: overrides,
      priceOverrides,
    });
  } catch (e) { return toResult(e); }
  revalidatePath(`/admin/sites/${id}`);
  return { ok: true, message: "Site kaydedildi." };
}
