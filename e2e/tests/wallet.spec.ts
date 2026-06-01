import { test, expect } from "@playwright/test";
import { uniqueEmail, WALLET_URL, TEST_PASSWORD } from "../helpers/test-setup";

test.describe.serial("Wallet UI", () => {
  const email = uniqueEmail();
  let walletId = "";

  test("register, login, and navigate to credentials", async ({ page }) => {
    await page.goto(WALLET_URL);

    // Fill login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to credentials screen
    await expect(page.locator("h1.section-title")).toContainText("Credentials");
    await expect(page.locator("nav")).toContainText("Wallet UI");

    // Extract wallet ID from localStorage
    const walletsData = await page.evaluate(() =>
      fetch("http://localhost:7001/wallet-api/wallet/accounts/wallets", {
        headers: {
          authorization: `Bearer ${localStorage.getItem("wallet_token")}`,
          "Content-Type": "application/json",
        },
      }).then((r) => r.json())
    );
    walletId = walletsData.wallets?.[0]?.id || "";
    expect(walletId).toBeTruthy();
  });

  test("navigate to Keys & DIDs page", async ({ page }) => {
    await page.click("nav button:has-text('Keys & DIDs')");
    await expect(page.locator("h1.section-title")).toContainText("Keys & DIDs");
    // Should show keys and DIDs sections
    await expect(page.locator("text=Keys")).toBeVisible();
    await expect(page.locator("text=DIDs")).toBeVisible();
  });

  test("navigate back to Credentials page", async ({ page }) => {
    await page.click("nav button:has-text('Credentials')");
    await expect(page.locator("h1.section-title")).toContainText("Credentials");
  });
});
