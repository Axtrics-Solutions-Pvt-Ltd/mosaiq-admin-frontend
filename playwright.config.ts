import { defineConfig, devices } from "@playwright/test";

const mobileChromium = {
  ...devices["Desktop Chrome"],
  hasTouch: true,
  isMobile: true,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-390-chromium",
      use: { ...mobileChromium, viewport: { height: 844, width: 390 } },
    },
    {
      name: "mobile-320-chromium",
      use: { ...mobileChromium, viewport: { height: 700, width: 320 } },
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-auth-api.mjs",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://127.0.0.1:4444/health",
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3100",
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:4444",
        NEXT_ADMIN_ORIGIN: "http://localhost:3100",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://localhost:3100/login",
    },
  ],
});
