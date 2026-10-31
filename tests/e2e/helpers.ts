import { execSync } from "node:child_process";
import type { Page } from "@playwright/test";

export const ADMIN = { email: "admin@test.local", password: "test-password-123" };

export function ensureAdmin() {
  execSync(`pnpm -s tsx --env-file=.env scripts/seed-admin.ts ${ADMIN.email} ${ADMIN.password} admin`, { stdio: "ignore" });
}

export async function login(page: Page) {
  await page.goto("http://panel.localhost:3000/admin/login");
  await page.getByLabel("E-posta").fill(ADMIN.email);
  await page.getByLabel("Şifre").fill(ADMIN.password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForURL("**/admin/orders");
}

/** Places an order on the poset demo site through the real landing form; returns the order number. */
export async function placeOrder(page: Page, offerLabel = "3 Al 2 Öde"): Promise<string> {
  await page.goto("http://poset.localhost:3000/");
  await page.getByLabel(offerLabel, { exact: true }).check();
  await page.getByLabel("Ad Soyad").fill("Ayşe Yılmaz");
  await page.getByLabel("Telefon").fill("5321234567");
  await page.getByLabel("İl", { exact: true }).selectOption("İSTANBUL");
  await page.getByLabel("İlçe").selectOption("KADIKÖY");
  await page.getByLabel("Adres").fill("Moda Mah. Örnek Sok. No 1");
  await page.getByRole("button", { name: /siparişi tamamla/i }).click();
  await page.waitForURL("**/tesekkurler**");
  return page.getByTestId("order-no").innerText();
}
