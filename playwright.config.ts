import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PREVIEW_URL ?? "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    channel: "chrome",
  },
  projects: [
    { name: "desktop-mouse", use: { viewport: { width: 1280, height: 960 } } },
    {
      name: "mobile-touch",
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
  ],
});
