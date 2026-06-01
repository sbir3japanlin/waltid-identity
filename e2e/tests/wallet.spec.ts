import { test, expect, type Page } from "@playwright/test";
import { uniqueEmail, WALLET_URL, TEST_PASSWORD } from "../helpers/test-setup";

test.describe.serial("Wallet UI", () => {
  const email = uniqueEmail();
  let walletId = "";
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test("register, login, and navigate to credentials", async () => {
    await page.goto(WALLET_URL);

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page.locator("h1.section-title")).toContainText("Credentials");
    await expect(page.locator("nav")).toContainText("Wallet UI");

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

  test("navigate to Keys & DIDs page", async () => {
    await page.click("nav button:has-text('Keys & DIDs')");
    await expect(page.locator("h1.section-title")).toContainText("Keys & DIDs");
    await expect(page.locator("text=Keys")).toBeVisible();
    await expect(page.locator("text=DIDs")).toBeVisible();
  });

  test("navigate back to Credentials page", async () => {
    await page.click("nav button:has-text('Credentials')");
    await expect(page.locator("h1.section-title")).toContainText("Credentials");
  });
});
