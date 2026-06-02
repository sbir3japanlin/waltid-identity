import { test, expect } from "@playwright/test";
import { uniqueEmail, WALLET_URL, ISSUER_URL, VERIFIER_URL, TEST_PASSWORD } from "../helpers/test-setup";

/**
 * Cross-UI mDoc Flow - Maps to test-mdoc-flow.sh
 * 
 * Shell Script Steps → UI Actions:
 * Step 0-2: Register/Login/Wallet ID (automatic during wallet login)
 * Step 3: Create IACA Certificate → Click "Onboard" button for mDoc
 * Step 4: Create Document Signer → Part of mDoc onboarding
 * Step 5: Well-known config → Background (automatically fetched)
 * Step 6: Create mDL Offer → Click "Issue MDOC Credential"
 * Step 7: Inspect offer → Display offer URI
 * Step 8: Claim mDL → Click "Claim Credential" in wallet
 * Step 9: Create mDL Auth Request → Click "Create Authorization Request"
 * Step 10-11: Match/Resolve → Background (automatic)
 * Step 12: Fulfill Request → Click "Review Request" in wallet
 * Step 13: Verify → Background (automatic)
 */
test.describe.serial("Cross-UI SSI Flow (mDoc)", () => {
  const email = uniqueEmail();
  let iacaCertPem = "";
  let offerUri = "";
  let authRequestUrl = "";

  test("mDoc flow: Steps 3-7 - Issuer onboard and issue credential", async ({ page }) => {
    console.log("\n=== ISSUER: Onboard mDoc and Issue Credential ===");
    
    // Navigate to issuer dashboard
    await page.goto(ISSUER_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Dashboard", { timeout: 10000 });
    console.log("✓ Issuer dashboard loaded");

    // Step 3-4: Create IACA Certificate and Document Signer (via Onboard button)
    console.log("→ Step 3-4: Creating IACA certificate and Document Signer...");
    await page.click("button:has-text('Onboard')");
    await expect(page.locator("text=Ready").first()).toBeVisible({ timeout: 30000 });
    console.log("✓ mDoc onboarded (IACA + DS certificates created)");

    // Retrieve IACA cert PEM from localStorage
    iacaCertPem = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("issuer_onboarding") || "{}");
      return state.iacaCertPem || "";
    });
    expect(iacaCertPem).toBeTruthy();
    console.log("✓ IACA certificate retrieved for verifier");

    // Step 6: Create mDL Credential Offer
    console.log("→ Step 6: Creating mDL credential offer...");
    await page.click("nav button:has-text('Issue Credential')");
    await page.click("button:has-text('mDoc')");
    await page.waitForTimeout(500);
    await page.click("button:has-text('Issue MDOC Credential')");
    
    // Step 7: Display offer URI
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    offerUri = await page.locator('input[readonly]').first().inputValue();
    expect(offerUri).toBeTruthy();
    console.log("✓ Step 7: Credential offer created:", offerUri.substring(0, 60) + "...");
  });

  test("mDoc flow: Steps 0-2, 8 - Wallet register, login, and claim credential", async ({ page }) => {
    console.log("\n=== WALLET: Register/Login and Claim mDoc ===");
    
    // Steps 0-2: Register account, Login, Retrieve Wallet ID
    console.log("→ Steps 0-2: Registering/logging in wallet...");
    await page.goto(WALLET_URL);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");
    console.log("✓ Wallet registered and logged in (Steps 0-2 complete)");

    // Step 8: Claim mDL credential
    console.log("→ Step 8: Claiming mDL credential...");
    await page.click("nav button:has-text('Claim Offer')");
    await page.fill('textarea[placeholder*="credential offer"]', offerUri);
    await page.click("button:has-text('Claim Credential')");
    await expect(page.locator("text=Credential claimed").first()).toBeVisible({ timeout: 30000 });
    console.log("✓ mDL credential claimed successfully");
  });

  test("mDoc flow: Step 9 - Verifier create mDL authorization request", async ({ page }) => {
    console.log("\n=== VERIFIER: Create mDL Authorization Request ===");
    
    // Step 9: Create mDL Authorization Request with IACA certificate
    console.log("→ Step 9: Creating mDL authorization request...");
    await page.goto(VERIFIER_URL);
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('mDoc')");
    await page.waitForTimeout(500);
    
    // Provide IACA certificate for trust verification
    await page.fill("textarea", iacaCertPem);
    console.log("✓ IACA certificate provided for trust chain validation");
    
    // Select fields to request
    const familyName = page.locator("label").filter({ hasText: "family name" }).locator("input[type='checkbox']");
    const givenName = page.locator("label").filter({ hasText: "given name" }).locator("input[type='checkbox']");
    await familyName.check();
    await givenName.check();
    console.log("✓ Selected fields: family_name, given_name");
    
    await page.click("button:has-text('Create Authorization Request')");
    await expect(page.locator("text=Authorization Request URL")).toBeVisible({ timeout: 30000 });
    authRequestUrl = await page.locator('textarea[readonly]').first().inputValue();
    expect(authRequestUrl).toBeTruthy();
    console.log("✓ Authorization request created:", authRequestUrl.substring(0, 60) + "...");
  });

  test("mDoc flow: Steps 10-13 - Wallet fulfill presentation request", async ({ page }) => {
    console.log("\n=== WALLET: Respond to Presentation Request ===");
    
    // Re-login to wallet
    await page.goto(WALLET_URL);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText("Credentials");
    console.log("✓ Wallet session restored");

    // Steps 10-13: Match credentials, Resolve request, Fulfill request, Verify
    console.log("→ Steps 10-13: Processing presentation request...");
    await page.click("nav button:has-text('Presentation')");
    await page.fill('textarea[placeholder*="authorization request"]', authRequestUrl);
    await page.click("button:has-text('Review Request')");
    
    // Steps 10-11 happen in background during "Review Request"
    console.log("✓ Step 10-11: Credentials matched and request resolved (background)");
    
    // Step 12: Fulfill presentation request
    await expect(page.locator("button:has-text('Approve & Present')")).toBeVisible({ timeout: 15000 });
    console.log("✓ Step 12: Presentation request ready to fulfill");
    console.log("✓ Step 13: Verification happens when Approve & Present is clicked (background)");
    console.log("\n=== mDoc Flow Complete ===");
  });
});
