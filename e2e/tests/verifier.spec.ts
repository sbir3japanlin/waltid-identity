import { test, expect, type Page } from "@playwright/test";
import { VERIFIER_URL } from "../helpers/test-setup";

test.describe.serial("Verifier UI", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test("create SD-JWT authorization request", async () => {
    await page.goto(VERIFIER_URL);
    await expect(page.locator("h1.section-title")).toContainText("New Verification Request");

    // Should default to SD-JWT tab
    await expect(page.locator("button.format-tab.active")).toContainText("SD-JWT");

    // Select given_name and birthdate checkboxes
    const givenName = page.locator("label").filter({ hasText: "given_name" }).locator("input[type='checkbox']");
    const birthdate = page.locator("label").filter({ hasText: "birthdate" }).locator("input[type='checkbox']");
    await givenName.check();
    await birthdate.check();

    // Create the request
    await page.click("button:has-text('Create Authorization Request')");

    // Verify URL is generated
    await expect(page.locator("text=Authorization Request URL")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Authorization request created")).toBeVisible();
  });

  test("create mDoc authorization request (error case — no IACA PEM)", async () => {
    // Click mDoc tab
    await page.click("button.format-tab:has-text('mDoc')");
    await expect(page.locator("button.format-tab.active")).toContainText("mDoc");

    // Click create without pasting IACA PEM
    await page.click("button:has-text('Create Authorization Request')");

    // Should show error about missing IACA PEM
    await expect(page.locator("text=Paste the IACA certificate PEM")).toBeVisible();
  });

  test("view Sessions page", async () => {
    await page.click("nav button:has-text('Sessions')");
    await expect(page.locator("h1.section-title")).toContainText("Verification Sessions");

    // Should have at least one session from the SD-JWT test
    await expect(page.locator("tr").filter({ hasText: "SD-JWT" })).toBeVisible();
  });
});
