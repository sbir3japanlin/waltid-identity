import { test, expect } from "@playwright/test";
import { uniqueEmail, WALLET_URL, ISSUER_URL, VERIFIER_URL, TEST_PASSWORD } from "../helpers/test-setup";

test.describe.serial("Cross-UI SSI Flow", () => {
  const email = uniqueEmail();
  let iacaCertPem = "";
  let offerUri = "";
  let authRequestUrl = "";

  test("issuer: onboard mDoc and issue mDoc credential", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(ISSUER_URL);
    await page.waitForLoadState("networkidle");

    // Wait for Dashboard to load
    await expect(page.locator("h1")).toContainText("Dashboard", { timeout: 10000 });

    // Onboard mDoc - click first Onboard button
    await page.click("button:has-text('Onboard')");
    await expect(page.locator("text=Ready").first()).toBeVisible({ timeout: 30000 });

    // Extract IACA cert PEM from localStorage
    iacaCertPem = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("issuer_onboarding") || "{}");
      return state.iacaCertPem || "";
    });
    expect(iacaCertPem).toBeTruthy();

    // Issue mDoc credential
    await page.click("nav button:has-text('Issue Credential')");
    await page.click("button:has-text('mDoc')");
    await page.waitForTimeout(500);
    await page.click("button:has-text('Issue MDOC Credential')");
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });

    // Extract offer URI from the readOnly input
    offerUri = await page.locator('input[readonly]').first().inputValue();
    expect(offerUri).toBeTruthy();

    await page.close();
  });

  test("wallet: login and claim the mDoc offer", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(WALLET_URL);

    // Login
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");

    // Navigate to Claim Offer
    await page.click("nav button:has-text('Claim Offer')");

    // Paste the offer URI and claim
    await page.fill('textarea[placeholder*="credential offer"]', offerUri);
    await page.click("button:has-text('Claim Credential')");

    // Verify success (use first() to avoid strict mode violation)
    await expect(page.locator("text=Credential claimed").first()).toBeVisible({ timeout: 30000 });

    await page.close();
  });

  test("verifier: create mDoc auth request with IACA cert", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(VERIFIER_URL);
    await page.waitForLoadState("networkidle");

    // Switch to mDoc tab
    await page.click("button:has-text('mDoc')");
    await page.waitForTimeout(500);

    // Paste IACA cert PEM
    await page.fill("textarea", iacaCertPem);

    // Select fields (using actual UI text)
    const familyName = page.locator("label").filter({ hasText: "family name" }).locator("input[type='checkbox']");
    const givenName = page.locator("label").filter({ hasText: "given name" }).locator("input[type='checkbox']");
    await familyName.check();
    await givenName.check();

    // Create request
    await page.click("button:has-text('Create Authorization Request')");
    await expect(page.locator("text=Authorization Request URL")).toBeVisible({ timeout: 30000 });

    // Extract the auth request URL
    authRequestUrl = await page.locator('textarea[readonly]').first().inputValue();
    expect(authRequestUrl).toBeTruthy();

    await page.close();
  });

  test("wallet: respond to presentation request", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(WALLET_URL);

    // Login with same email
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");

    // Navigate to Presentation
    await page.click("nav button:has-text('Presentation')");

    // Paste auth request URL and resolve
    await page.fill('textarea[placeholder*="authorization request"]', authRequestUrl);
    await page.click("button:has-text('Review Request')");

    // Should advance to review step
    await expect(page.locator("button:has-text('Approve & Present')")).toBeVisible({ timeout: 15000 });

    await page.close();
  });
});
