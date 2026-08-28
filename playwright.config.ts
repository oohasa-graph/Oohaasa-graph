import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATA_FIXTURE_MODE: "1",
      PRIVATE_USERNAME: "owner",
      PRIVATE_PASSWORD_HASH: "$2b$04$pEQRgB0EyvbiupFbd0AAPeL2wPrDEWOKay1x3m5nIVIhqiKncMHlm",
      NEXTAUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      INGEST_SECRET: "test-ingest-secret-with-at-least-thirty-two-characters",
      DATABASE_URL: "postgres://unused:unused@127.0.0.1:5432/unused",
      SOURCE_USER_AGENT: "oohaasa-gogo-e2e/0.1 (contact: test@example.invalid)",
    },
  },
});
