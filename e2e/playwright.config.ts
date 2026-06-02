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

  // ‘off’, ‘on’, ‘retain-on-failure’, and ‘on-first-retry’.
  use: {
    trace: "on-first-retry",
    screenshot: "on",
    // Record video for every test. Increase viewport to 1920x1080 for HD
    // recordings and set explicit video size to ensure produced files are 1080p.
    video: { mode: "on", size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 },
    // Use deviceScaleFactor 1 to map CSS pixels 1:1 to the recorded pixels.
    deviceScaleFactor: 1,
    launchOptions: { args: ['--force-device-scale-factor=1', '--hide-scrollbars'] },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
