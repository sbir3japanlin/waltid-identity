import { test, expect, type Page } from "@playwright/test";
import { ISSUER_URL } from "../helpers/test-setup";

test.describe.serial("Issuer UI", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test("navigate to Dashboard and onboard mDoc (IACA + DS)", async () => {
    await page.goto(ISSUER_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Dashboard", { timeout: 10000 });

    // Click the first Onboard button (which is for mDoc/MDOC)
    await page.click("button:has-text('Onboard')");

    // Wait for success — check for "Ready" status
    await expect(page.locator("text=Ready").first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=mDoc onboarding complete")).toBeVisible();
  });

  test("onboard Issuer (SD-JWT / JWT VC)", async () => {
    // Click the second Onboard button (for SD-JWT / JWT VC)
    await page.click("button:has-text('Onboard') >> nth=1");

    // Wait for second Ready status to appear
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Ready").nth(1)).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Issuer onboarded")).toBeVisible();
  });

  test("issue mDoc credential", async () => {
    await page.click("nav button:has-text('Issue Credential')");
    await expect(page.locator("h1")).toContainText("Issue Credential");

    // Select mDoc tab
    await page.click("button:has-text('mDoc')");
    await page.waitForTimeout(500);

    // Click issue button
    await page.click("button:has-text('Issue MDOC Credential')");

    // Verify offer URI is generated
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Credential offer created").last()).toBeVisible();
  });

  test("issue SD-JWT credential", async () => {
    // Select SD-JWT tab
    await page.click("button:has-text('SD-JWT')");
    await page.waitForTimeout(500);

    await page.click("button:has-text('Issue SD-JWT Credential')");

    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Credential offer created").last()).toBeVisible();
  });

  test("view Offers page", async () => {
    await page.click("nav button:has-text('Offers')");
    await expect(page.locator("h1")).toContainText("Active Offers");

    // Should have at least one offer from the previous tests
    // Check for SD-JWT or MDOC text on the page
    await expect(page.locator("text=SD-JWT").first()).toBeVisible();
  });
});
