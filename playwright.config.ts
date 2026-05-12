import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      SKIP_ENV_VALIDATION: "1",
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54333/staffstack",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "01234567890123456789012345678901",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
    },
  },
});
