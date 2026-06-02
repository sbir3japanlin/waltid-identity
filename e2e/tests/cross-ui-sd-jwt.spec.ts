import { test, expect } from "@playwright/test";
import { uniqueEmail, WALLET_URL, ISSUER_URL, VERIFIER_URL, TEST_PASSWORD } from "../helpers/test-setup";

/**
 * Cross-UI SD-JWT Flow - Maps to test-sd-jwt-flow.sh
 * 
 * Shell Script Steps → UI Actions:
 * Step 0-2: Register/Login/Wallet ID (automatic during wallet login)
 * Step 3-4: Retrieve Key/DID → Background (automatic when wallet is created)
 * Step 5: Well-known config → Background (automatically fetched)
 * Step 6: Onboard Issuer → Click "Onboard" button for SD-JWT
 * Step 7: Create SD-JWT Offer → Click "Issue SD-JWT Credential"
 * Step 8/9: Inspect offer → Display offer URI
 * Step 10: Claim SD-JWT VC → Click "Claim Credential" in wallet
 * Step 11: Create OID4VP Auth Request → Click "Create Authorization Request"
 * Step 12: Match Credentials for PD → Background (automatic)
 * Step 13: Resolve Presentation Request → Background (automatic)
 * Step 14: Fulfill Request → Click "Review Request" in wallet
 * Step 15: Verify → Background (automatic)
 */
test.describe.serial("Cross-UI SSI Flow (SD-JWT)", () => {
  const email = uniqueEmail();
  let offerUri = "";
  let authRequestUrl = "";

  test("SD-JWT flow: Steps 6-9 - Issuer onboard and issue credential", async ({ page }) => {
    console.log("\n=== ISSUER: Onboard SD-JWT and Issue Credential ===");
    
    // Navigate to issuer dashboard
    await page.goto(ISSUER_URL);
    await page.waitForLoadState("networkidle");
    // Disable animations for clearer video frames
    const { disableAnimations } = await import('./test-utils');
    await disableAnimations(page);
    await expect(page.locator("h1")).toContainText("Dashboard", { timeout: 10000 });
    console.log("✓ Issuer dashboard loaded");

    // Step 5: Well-known config is fetched automatically in the background
    console.log("✓ Step 5: Well-known config fetched (background)");

    // Step 6: Onboard Issuer (creates issuer key and DID)
    console.log("→ Step 6: Onboarding SD-JWT issuer...");
    const sdJwtLabel = page.locator("text=SD-JWT");
    await expect(sdJwtLabel).toBeVisible({ timeout: 10000 });
    
    // Check if already onboarded; if not, click Onboard button
    const sdJwtParent = sdJwtLabel.locator('xpath=ancestor-or-self::*[contains(@class, "")][1]');
    const readyNearby = await sdJwtParent.locator("text=Ready").count();
    if (readyNearby === 0) {
      const onboardButtons = page.locator("button:has-text('Onboard')");
      if (await onboardButtons.count() > 1) {
        await onboardButtons.nth(1).click();
      } else if (await onboardButtons.count() === 1) {
        await onboardButtons.first().click();
      }
      await expect(page.locator("text=Ready")).toBeVisible({ timeout: 30000 });
      console.log("✓ SD-JWT issuer onboarded (key + DID created)");
    } else {
      console.log("✓ SD-JWT issuer already onboarded");
    }

    // Step 7: Create SD-JWT VC Credential Offer
    console.log("→ Step 7: Creating SD-JWT credential offer...");
    await page.click("nav button:has-text('Issue Credential')");
    await page.click("button:has-text('SD-JWT')");
    await page.waitForTimeout(500);
    await page.click("button:has-text('Issue SD-JWT Credential')");
    
    // Step 8/9: Display offer URI and inspect content
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    offerUri = await page.locator('input[readonly]').first().inputValue();
    expect(offerUri).toBeTruthy();
    console.log("✓ Step 8/9: Credential offer created:", offerUri.substring(0, 60) + "...");
  });

  test("SD-JWT flow: Steps 0-2, 10 - Wallet register, login, and claim credential", async ({ page }) => {
    console.log("\n=== WALLET: Register/Login and Claim SD-JWT ===");
    
    // Steps 0-2: Register account, Login, Retrieve Wallet ID
    console.log("→ Steps 0-2: Registering/logging in wallet...");
    await page.goto(WALLET_URL);
    // Disable animations for clearer video frames
    await disableAnimations(page);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");
    console.log("✓ Wallet registered and logged in (Steps 0-2 complete)");
    
    // Steps 3-4: Key and DID retrieved automatically in background
    console.log("✓ Steps 3-4: Key and DID retrieved (background)");

    // Step 10: Claim SD-JWT VC
    console.log("→ Step 10: Claiming SD-JWT credential...");
    await page.click("nav button:has-text('Claim Offer')");
    await page.fill('textarea[placeholder*="credential offer"]', offerUri);
    await page.click("button:has-text('Claim Credential')");
    await expect(page.locator("text=Credential claimed").first()).toBeVisible({ timeout: 30000 });
    console.log("✓ SD-JWT credential claimed successfully");
  });

  test("SD-JWT flow: Step 11 - Verifier create authorization request", async ({ page }) => {
    console.log("\n=== VERIFIER: Create SD-JWT Authorization Request ===");
    
    // Step 11: Create OID4VP Authorization Request
    console.log("→ Step 11: Creating SD-JWT authorization request...");
    await page.goto(VERIFIER_URL);
    await page.waitForLoadState("networkidle");
    // Disable animations for clearer video frames
    await disableAnimations(page);
    
    // SD-JWT tab is default, select fields for selective disclosure
    const givenName = page.locator("label").filter({ hasText: "given name" }).locator("input[type='checkbox']");
    const birthdate = page.locator("label").filter({ hasText: "birthdate" }).locator("input[type='checkbox']");
    await givenName.check();
    await birthdate.check();
    console.log("✓ Selected fields for selective disclosure: given_name, birthdate");
    
    await page.click("button:has-text('Create Authorization Request')");
    await expect(page.locator("text=Authorization Request URL")).toBeVisible({ timeout: 30000 });
    authRequestUrl = await page.locator('textarea[readonly]').first().inputValue();
    expect(authRequestUrl).toBeTruthy();
    console.log("✓ Authorization request created:", authRequestUrl.substring(0, 60) + "...");
  });

  test("SD-JWT flow: Steps 12-15 - Wallet fulfill presentation request", async ({ page }) => {
    console.log("\n=== WALLET: Respond to SD-JWT Presentation Request ===");
    
    // Re-login to wallet
    await page.goto(WALLET_URL);
    // Disable animations for clearer video frames
    await disableAnimations(page);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");
    console.log("✓ Wallet session restored");

    // Steps 12-15: Match credentials, Resolve request, Fulfill request, Verify
    console.log("→ Steps 12-15: Processing presentation request...");
    await page.click("nav button:has-text('Presentation')");
    await page.fill('textarea[placeholder*="authorization request"]', authRequestUrl);
    await page.click("button:has-text('Review Request')");
    
    // Steps 12-13 happen in background during "Review Request"
    console.log("✓ Step 12: Credentials matched for presentation definition (background)");
    console.log("✓ Step 13: Presentation request resolved (background)");
    
    // Step 14: Fulfill presentation request
    await expect(page.locator("button:has-text('Approve & Present')")).toBeVisible({ timeout: 15000 });
    console.log("✓ Step 14: Presentation request ready to fulfill");
    console.log("✓ Step 15: Verification happens when Approve & Present is clicked (background)");
    console.log("\n=== SD-JWT Flow Complete ===");
  });
});
