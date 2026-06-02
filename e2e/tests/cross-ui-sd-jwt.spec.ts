import { test, expect } from "@playwright/test";
import { uniqueEmail, WALLET_URL, ISSUER_URL, VERIFIER_URL, TEST_PASSWORD } from "../helpers/test-setup";

test.describe.serial("Cross-UI SSI Flow (SD-JWT)", () => {
  const email = uniqueEmail();
  let offerUri = "";
  let authRequestUrl = "";

  test("issuer: onboard SD-JWT issuer and issue SD-JWT credential", async ({ page }) => {
    await page.goto(ISSUER_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Dashboard", { timeout: 10000 });

    // Ensure SD-JWT issuer is onboarded. If not onboarded, click the Onboard button; otherwise continue.
    const sdJwtLabel = page.locator("text=SD-JWT");
    await expect(sdJwtLabel).toBeVisible({ timeout: 10000 });
    // Try to detect a nearby "Ready" status; if missing, click the Onboard button for SD-JWT
    const sdJwtParent = sdJwtLabel.locator('xpath=ancestor-or-self::*[contains(@class, "")][1]');
    const readyNearby = await sdJwtParent.locator("text=Ready").count();
    if (readyNearby === 0) {
      // Find Onboard button near SD-JWT and click it (fallback to first onboard if necessary)
      const onboardButtons = page.locator("button:has-text('Onboard')");
      if (await onboardButtons.count() > 1) {
        await onboardButtons.nth(1).click();
      } else if (await onboardButtons.count() === 1) {
        await onboardButtons.first().click();
      }
      await expect(page.locator("text=Ready").nth(1)).toBeVisible({ timeout: 30000 });
    }

    // Issue SD-JWT credential
    await page.click("nav button:has-text('Issue Credential')");
    await page.click("button:has-text('SD-JWT')");
    await page.waitForTimeout(500);
    await page.click("button:has-text('Issue SD-JWT Credential')");
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    offerUri = await page.locator('input[readonly]').first().inputValue();
    expect(offerUri).toBeTruthy();
  });

  test("wallet: login and claim the SD-JWT offer", async ({ page }) => {
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

  test("verifier: create SD-JWT authorization request", async ({ page }) => {
    await page.goto(VERIFIER_URL);
    await page.waitForLoadState("networkidle");
    // Assume SD-JWT tab is default; select fields
    const givenName = page.locator("label").filter({ hasText: "given name" }).locator("input[type='checkbox']");
    const birthdate = page.locator("label").filter({ hasText: "birthdate" }).locator("input[type='checkbox']");
    await givenName.check();
    await birthdate.check();
    await page.click("button:has-text('Create Authorization Request')");
    await expect(page.locator("text=Authorization Request URL")).toBeVisible({ timeout: 30000 });
    authRequestUrl = await page.locator('textarea[readonly]').first().inputValue();
    expect(authRequestUrl).toBeTruthy();
  });

  test("wallet: respond to SD-JWT presentation request", async ({ page }) => {
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
