import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined } },
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
