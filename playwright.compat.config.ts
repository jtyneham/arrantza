import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results/compat-artifacts",
  testDir: "./tests/browser",
  testMatch: "compat.spec.ts",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.PREVIEW_URL ?? "http://127.0.0.1:4174/arrantza/",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "webkit-touch", use: { ...devices["iPhone SE"], browserName: "webkit" } },
    { name: "firefox-mouse", use: { browserName: "firefox", viewport: { width: 1280, height: 960 } } },
  ],
});
