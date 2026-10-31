import { test, expect } from "@playwright/test";
import { ensureAdmin, login } from "./helpers";

test.beforeAll(() => ensureAdmin());

test("create site, publish it and warn about missing pixel", async ({ page }) => {
  const sub = `t${Date.now().toString(36)}`;
  await login(page);
  await page.goto("http://panel.localhost:3000/admin/sites");
  await page.getByLabel("Ana domain").selectOption({ label: "localhost" });
  await page.getByLabel("Subdomain").fill(sub);
  await expect(page.getByText(`Adres: ${sub}.localhost`)).toBeVisible();
  await page.getByRole("button", { name: "Siteyi oluştur" }).click();
  await expect(page.getByRole("heading", { name: `${sub}.localhost` })).toBeVisible();

  await page.getByLabel("Durum").selectOption("yayinda");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status")).toHaveText("Site kaydedildi.");
  await page.reload();
  await expect(page.getByText("Meta pixel kimliği girilmemiş")).toBeVisible();

  const res = await page.goto(`http://${sub}.localhost:3000/`);
  expect(res?.status()).toBe(200);
});

test("duplicate subdomain shows readable error", async ({ page }) => {
  await login(page);
  await page.goto("http://panel.localhost:3000/admin/sites");
  await page.getByLabel("Subdomain").fill("poset");
  await page.getByRole("button", { name: "Siteyi oluştur" }).click();
  await expect(page.getByText("Bu adres zaten kullanılıyor.")).toBeVisible();
});
