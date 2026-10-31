import { test, expect } from "@playwright/test";
import { ensureAdmin, login } from "./helpers";

test.beforeAll(() => ensureAdmin());

test("create product, edit content, add versioned offer and addon", async ({ page }) => {
  const name = `Test Ürün ${Date.now()}`;
  await login(page);
  await page.goto("http://panel.localhost:3000/admin/products");
  await page.getByLabel("Ürün adı").fill(name);
  await page.getByLabel("SKU").fill("T1");
  await page.getByLabel("Tekli fiyat (TL, KDV dahil)").fill("399");
  await page.getByRole("button", { name: "Ürünü oluştur" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.getByRole("link", { name: "İçerik" }).click();
  // react-hook-form fills inputs after hydration; wait for it before interacting
  await expect(page.getByLabel("Başlık", { exact: true })).toHaveValue(name);
  await page.getByLabel("Alt başlık", { exact: true }).fill("Tek dokunuşla kapat");
  await page.getByRole("button", { name: "Soru ekle" }).click();
  await page.getByLabel("Soru", { exact: true }).fill("Pil dahil mi?");
  await page.getByLabel("Cevap", { exact: true }).fill("Hayır.");
  await page.getByRole("button", { name: "İçeriği kaydet" }).click();
  await expect(page.getByRole("status")).toHaveText("İçerik kaydedildi.");
  await page.reload();
  await expect(page.getByLabel("Soru", { exact: true })).toHaveValue("Pil dahil mi?");

  await page.getByRole("link", { name: "Paketler" }).click();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Paketi ekle" }) });
  await form.getByLabel("Paket anahtarı").fill("3al2");
  await form.getByLabel("Etiket", { exact: true }).fill("3 Al 2 Öde");
  await form.getByLabel("Ücretli adet").fill("2");
  await form.getByLabel("Bedava adet").fill("1");
  await form.getByLabel("Paket fiyatı (TL)").fill("599");
  await form.getByRole("button", { name: "Paketi ekle" }).click();
  await expect(page.getByText("3 Al 2 Öde · 599 ₺ · sürüm 1")).toBeVisible();

  const edit = page.locator("form").filter({ has: page.getByLabel("Paket anahtarı") }).first();
  await edit.getByLabel("Paket fiyatı (TL)").fill("649");
  await edit.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("3 Al 2 Öde · 649 ₺ · sürüm 2")).toBeVisible();

  await page.getByRole("link", { name: "Ek ürünler" }).click();
  const addon = page.locator("form").filter({ has: page.getByRole("button", { name: "Ek ürünü ekle" }) });
  await addon.getByLabel("Ad", { exact: true }).fill("Fırça");
  await addon.getByLabel("SKU").fill("FR");
  await addon.getByRole("button", { name: "Ek ürünü ekle" }).click();
  await expect(page.getByRole("button", { name: "Seçenek ekle" })).toBeVisible();
});
