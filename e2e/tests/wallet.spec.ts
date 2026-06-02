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

    await expect(page.locator("h1")).toContainText("Credentials");

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
    await expect(page.locator("h1")).toContainText("Keys & DIDs");
    await expect(page.locator("h3:has-text('Keys')")).toBeVisible();
    await expect(page.locator("h3:has-text('DIDs')")).toBeVisible();
  });

  test("navigate back to Credentials page", async () => {
    await page.click("nav button:has-text('Credentials')");
    await expect(page.locator("h1")).toContainText("Credentials");
  });

  test("navigate to Claim Offer page", async () => {
    await page.click("nav button:has-text('Claim Offer')");
    await expect(page.locator("h1")).toContainText("Claim Credential Offer");
    await expect(
      page.locator('textarea[placeholder*="credential offer"]')
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Claim Credential')")
    ).toBeVisible();
  });

  test("navigate to Presentation page", async () => {
    await page.click("nav button:has-text('Presentation')");
    await expect(page.locator("h1")).toContainText("Presentation Request");
    await expect(
      page.locator('textarea[placeholder*="authorization request"]')
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Review Request')")
    ).toBeVisible();
  });
});
