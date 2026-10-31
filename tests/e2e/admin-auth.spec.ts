import { test, expect } from "@playwright/test";
import { ensureAdmin, login } from "./helpers";

test.beforeAll(() => ensureAdmin());

test("redirects anonymous user to login", async ({ page }) => {
  await page.goto("http://panel.localhost:3000/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin can log in", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Siparişler" })).toBeVisible();
});

test("panel is not reachable from site host", async ({ page }) => {
  const res = await page.goto("http://poset.localhost:3000/admin/login");
  expect(res?.status()).toBe(404);
});
