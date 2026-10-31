import { test, expect } from "@playwright/test";
import { ensureAdmin, login, placeOrder } from "./helpers";

test.beforeAll(() => ensureAdmin());

test("order appears in panel; status change and address edit are recorded", async ({ page }) => {
  const orderNo = await placeOrder(page);
  await login(page);
  await page.getByLabel("Ara").fill(orderNo);
  await page.getByRole("button", { name: "Filtrele" }).click();
  await page.getByRole("link", { name: orderNo }).click();
  await expect(page.getByRole("heading", { name: orderNo })).toBeVisible();

  await page.getByRole("button", { name: "Onaylandı" }).click();
  await expect(page.getByText("Yeni → Onaylandı")).toBeVisible();

  await page.getByLabel("Adres").fill("Caferağa Mah. Yeni Sok. No 5");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status")).toHaveText("Sipariş güncellendi.");
  await page.reload();
  await expect(page.getByText("Düzenlendi: address")).toBeVisible();
});

test("bulk status change from list", async ({ page }) => {
  const orderNo = await placeOrder(page, "2 Adet");
  await login(page);
  await page.getByLabel("Ara").fill(orderNo);
  await page.getByRole("button", { name: "Filtrele" }).click();
  // the table is a client component: retry until hydration makes row selection work
  await expect(async () => {
    await page.getByLabel("Seç", { exact: true }).first().check();
    await expect(page.getByLabel("Yeni durum")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  await page.getByLabel("Yeni durum").selectOption("iptal");
  await page.getByRole("button", { name: "Durumu değiştir" }).click();
  await expect(page.getByRole("status")).toContainText("1 sipariş güncellendi.");
  await expect(page.getByRole("cell", { name: "İptal", exact: true })).toBeVisible();
});
