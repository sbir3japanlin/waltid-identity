import { test, expect } from "@playwright/test";
import { uniqueEmail, WALLET_URL, ISSUER_URL, VERIFIER_URL, TEST_PASSWORD } from "../helpers/test-setup";

test.describe.serial("Cross-UI SSI Flow (mDoc)", () => {
  const email = uniqueEmail();
  let iacaCertPem = "";
  let offerUri = "";
  let authRequestUrl = "";

  test("issuer: onboard mDoc and issue mDoc credential", async ({ page }) => {
    await page.goto(ISSUER_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Dashboard", { timeout: 10000 });
    await page.click("button:has-text('Onboard')");
    await expect(page.locator("text=Ready").first()).toBeVisible({ timeout: 30000 });
    iacaCertPem = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("issuer_onboarding") || "{}");
      return state.iacaCertPem || "";
    });
    expect(iacaCertPem).toBeTruthy();
    await page.click("nav button:has-text('Issue Credential')");
    await page.click("button:has-text('mDoc')");
    await page.waitForTimeout(500);
    await page.click("button:has-text('Issue MDOC Credential')");
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    offerUri = await page.locator('input[readonly]').first().inputValue();
    expect(offerUri).toBeTruthy();
  });

  test("wallet: login and claim the mDoc offer", async ({ page }) => {
    await page.goto(WALLET_URL);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");
    await page.click("nav button:has-text('Claim Offer')");
    await page.fill('textarea[placeholder*="credential offer"]', offerUri);
    await page.click("button:has-text('Claim Credential')");
    await expect(page.locator("text=Credential claimed").first()).toBeVisible({ timeout: 30000 });
  });

  test("verifier: create mDoc auth request with IACA cert", async ({ page }) => {
    await page.goto(VERIFIER_URL);
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('mDoc')");
    await page.waitForTimeout(500);
    await page.fill("textarea", iacaCertPem);
    const familyName = page.locator("label").filter({ hasText: "family name" }).locator("input[type='checkbox']");
    const givenName = page.locator("label").filter({ hasText: "given name" }).locator("input[type='checkbox']");
    await familyName.check();
    await givenName.check();
    await page.click("button:has-text('Create Authorization Request')");
    await expect(page.locator("text=Authorization Request URL")).toBeVisible({ timeout: 30000 });
    authRequestUrl = await page.locator('textarea[readonly]').first().inputValue();
    expect(authRequestUrl).toBeTruthy();
  });

  test("wallet: respond to presentation request", async ({ page }) => {
    await page.goto(WALLET_URL);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");
    await page.click("nav button:has-text('Presentation')");
    await page.fill('textarea[placeholder*="authorization request"]', authRequestUrl);
    await page.click("button:has-text('Review Request')");
    await expect(page.locator("button:has-text('Approve & Present')")).toBeVisible({ timeout: 15000 });
  });
});
