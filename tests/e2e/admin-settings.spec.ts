import { test, expect } from "@playwright/test";
import { ensureAdmin, login } from "./helpers";

test.beforeAll(() => ensureAdmin());

test("admin saves shipping settings", async ({ page }) => {
  await login(page);
  await page.goto("http://panel.localhost:3000/admin/settings");
  await page.getByLabel("Kargo ücreti (TL)").fill("49,90");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status")).toHaveText("Ayarlar kaydedildi.");
  await page.reload();
  await expect(page.getByLabel("Kargo ücreti (TL)")).toHaveValue("49,90");
});

test("domain form validates name", async ({ page }) => {
  await login(page);
  await page.goto("http://panel.localhost:3000/admin/domains");
  await page.getByLabel("Alan adı").fill("gecersiz");
  await page.getByRole("button", { name: "Ekle" }).click();
  await expect(page.getByText("Geçerli bir alan adı girin (ör. ornek.com).")).toBeVisible();
});
