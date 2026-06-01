import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],
  timeout: 60000,
  expect: { timeout: 15000 },

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  webServer: process.env.CI
    ? [
        { command: "cd ../local-ui-cc/wallet-ui && npx vite --port 5173", port: 5173, reuseExistingServer: true },
        { command: "cd ../local-ui-cc/issuer-ui && npx vite --port 5174", port: 5174, reuseExistingServer: true },
        { command: "cd ../local-ui-cc/verifier-ui && npx vite --port 5175", port: 5175, reuseExistingServer: true },
      ]
    : undefined,
});
