import { test, expect, type Page } from "@playwright/test";
import { ISSUER_URL } from "../helpers/test-setup";

test.describe.serial("Issuer UI", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test("navigate to Dashboard and onboard mDoc (IACA + DS)", async () => {
    await page.goto(ISSUER_URL);
    await expect(page.locator("h1.section-title")).toContainText("Dashboard");

    // Click the mDoc onboard button (first "Onboard" in the table)
    const mdocRow = page.locator("tr").filter({ hasText: "mDoc" });
    await mdocRow.locator("button:has-text('Onboard')").click();

    // Wait for success — the row status should change to "Ready"
    await expect(mdocRow.locator("td").nth(1)).toContainText("Ready", { timeout: 30000 });
    await expect(page.locator("text=mDoc onboarding complete")).toBeVisible();
  });

  test("onboard Issuer (SD-JWT / JWT VC)", async () => {
    const issuerRow = page.locator("tr").filter({ hasText: "SD-JWT" });
    await issuerRow.locator("button:has-text('Onboard')").click();

    await expect(issuerRow.locator("td").nth(1)).toContainText("Ready", { timeout: 30000 });
    await expect(page.locator("text=Issuer onboarded")).toBeVisible();
  });

  test("issue mDoc credential", async () => {
    await page.click("nav button:has-text('Issue Credential')");
    await expect(page.locator("h1.section-title")).toContainText("Issue Credential");

    // Select mDoc tab
    await page.click("button.format-tab:has-text('mDoc')");
    await expect(page.locator("button.format-tab.active")).toContainText("mDoc");

    // Click issue button
    await page.click("button:has-text('Issue MDOC Credential')");

    // Verify offer URI is generated
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Credential offer created").last()).toBeVisible();
  });

  test("issue SD-JWT credential", async () => {
    // Select SD-JWT tab
    await page.click("button.format-tab:has-text('SD-JWT')");
    await expect(page.locator("button.format-tab.active")).toContainText("SD-JWT");

    await page.click("button:has-text('Issue SD-JWT Credential')");

    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Credential offer created").last()).toBeVisible();
  });

  test("view Offers page", async () => {
    await page.click("nav button:has-text('Offers')");
    await expect(page.locator("h1.section-title")).toContainText("Active Offers");

    // Should have at least one offer from the previous tests
    const offers = page.locator(".card").filter({ hasText: /mDoc|SD-JWT|JWT VC/ });
    await expect(offers.first()).toBeVisible();
  });
});
