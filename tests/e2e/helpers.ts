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
