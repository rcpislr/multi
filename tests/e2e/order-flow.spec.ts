import { test, expect } from "@playwright/test";
import { ensureAdmin, login } from "./helpers";

test.beforeAll(() => ensureAdmin());

test("customer orders on subdomain and order shows in panel", async ({ page }) => {
  await page.goto("http://poset.localhost:3000/");
  await page.getByLabel("3 Al 2 Öde", { exact: true }).check();
  await expect(page.getByTestId("order-total")).toHaveText("599 ₺");
  await page.getByLabel("Ad Soyad").fill("Ayşe Yılmaz");
  await page.getByLabel("Telefon").fill("5321234567");
  await page.getByLabel("İl", { exact: true }).selectOption("İSTANBUL");
  await page.getByLabel("İlçe").selectOption("KADIKÖY");
  await page.getByLabel("Adres").fill("Moda Mah. Örnek Sok. No 1");
  await page.getByLabel(/sözleşme/i).check();
  await page.getByRole("button", { name: /siparişi tamamla/i }).click();
  await expect(page.getByRole("heading", { name: "Siparişiniz alındı" })).toBeVisible();
  const orderNo = await page.getByTestId("order-no").innerText();

  await login(page);
  await page.goto("http://panel.localhost:3000/admin/orders");
  await expect(page.getByText(orderNo)).toBeVisible();
});

test("validation errors are shown next to fields", async ({ page }) => {
  await page.goto("http://poset.localhost:3000/");
  await page.getByLabel("Ad Soyad").fill("Ayşe Yılmaz");
  await page.getByLabel("Telefon").fill("1234");
  await page.getByLabel("İl", { exact: true }).selectOption("ANKARA");
  await page.getByLabel("İlçe").selectOption("ÇANKAYA");
  await page.getByLabel("Adres").fill("Kısa");
  await page.getByRole("button", { name: /siparişi tamamla/i }).click();
  await expect(page.getByText("Geçerli bir cep telefonu girin (5XX XXX XX XX).")).toBeVisible();
});

test("unknown subdomain is 404", async ({ page }) => {
  const res = await page.goto("http://yok.localhost:3000/");
  expect(res?.status()).toBe(404);
});

test("honeypot field cannot be autofilled as a website/url field", async ({ page }) => {
  await page.goto("http://poset.localhost:3000/");
  await expect(page.locator('input[name="website"], input[name="url"], input[autocomplete="url"]')).toHaveCount(0);
  await expect(page.locator('input[name="hp_ref"]')).toHaveAttribute("autocomplete", "off");
});

test("security headers: thank-you page never leaks its token as a referrer", async ({ page }) => {
  const landing = await page.goto("http://poset.localhost:3000/");
  expect(landing?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(landing?.headers()["x-content-type-options"]).toBe("nosniff");
  const thanks = await page.goto("http://poset.localhost:3000/tesekkurler?t=00000000000000000000000000000000");
  expect(thanks?.headers()["referrer-policy"]).toBe("no-referrer");
});

test("auth endpoints are not served on site hosts", async ({ page }) => {
  const res = await page.goto("http://poset.localhost:3000/api/auth/get-session");
  expect(res?.status()).toBe(404);
});
