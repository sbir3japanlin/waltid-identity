# Playwright E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright e2e tests covering all core user flows across wallet-ui (5173), issuer-ui (5174), verifier-ui (5175), plus one cross-UI SSI lifecycle test.

**Architecture:** 4 spec files in `e2e/tests/` (wallet, issuer, verifier, cross-ui), each using `test.describe.serial` to share state within the file. A helper module generates unique test credentials. Playwright config runs chromium + firefox, fully parallel across files. Real Docker backends required on ports 7001-7003.

**Tech Stack:** Playwright 1.x, @playwright/test, TypeScript, Vite dev servers (local dev) or webServer config (CI)

---

### Task 1: Create e2e directory and package.json

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/.gitignore`

- [ ] **Step 1: Create e2e directory**

```bash
mkdir -p e2e/tests e2e/helpers
```

- [ ] **Step 2: Write package.json**

File: `e2e/package.json`
```json
{
  "name": "waltid-e2e",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0"
  }
}
```

- [ ] **Step 3: Write .gitignore**

File: `e2e/.gitignore`
```
node_modules/
test-results/
playwright-report/
blob-report/
playwright/.cache/
```

- [ ] **Step 4: Install npm dependencies**

```bash
cd e2e && npm install
```
Expected: installs @playwright/test and dependencies without errors.

- [ ] **Step 5: Commit**

```bash
git add e2e/package.json e2e/package-lock.json e2e/.gitignore
git commit -m "feat: scaffold e2e directory with Playwright dependency"
```

---

### Task 2: Create Playwright config

**Files:**
- Create: `e2e/playwright.config.ts`

- [ ] **Step 1: Write playwright.config.ts**

File: `e2e/playwright.config.ts`
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],
  timeout: 60000,
  expect: { timeout: 15000 },

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  webServer: process.env.CI
    ? [
        { command: "cd ../local-ui-cc/wallet-ui && npx vite --port 5173", port: 5173, reuseExistingServer: true },
        { command: "cd ../local-ui-cc/issuer-ui && npx vite --port 5174", port: 5174, reuseExistingServer: true },
        { command: "cd ../local-ui-cc/verifier-ui && npx vite --port 5175", port: 5175, reuseExistingServer: true },
      ]
    : undefined,
});
```

- [ ] **Step 2: Verify config loads**

```bash
npx playwright test --list
```
Expected: no projects listed yet (no test files).

- [ ] **Step 3: Commit**

```bash
git add e2e/playwright.config.ts
git commit -m "feat: add Playwright config (chromium + firefox, 60s timeout)"
```

---

### Task 3: Create test helpers

**Files:**
- Create: `e2e/helpers/test-setup.ts`

- [ ] **Step 1: Write test-setup.ts**

File: `e2e/helpers/test-setup.ts`
```typescript
let counter = 0;

export function uniqueEmail(): string {
  counter += 1;
  const ts = Date.now();
  return `e2e-${ts}-${counter}@test.com`;
}

export const WALLET_URL = "http://localhost:5173";
export const ISSUER_URL = "http://localhost:5174";
export const VERIFIER_URL = "http://localhost:5175";

export const TEST_PASSWORD = "test123";
```

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/test-setup.ts
git commit -m "feat: add e2e test helpers (unique email, URL constants)"
```

---

### Task 4: Write wallet.spec.ts — login + credentials + keys-dids

**Files:**
- Create: `e2e/tests/wallet.spec.ts`

- [ ] **Step 1: Write wallet login + credentials + keys-dids tests**

File: `e2e/tests/wallet.spec.ts`
```typescript
import { test, expect } from "@playwright/test";
import { uniqueEmail, WALLET_URL, TEST_PASSWORD } from "../helpers/test-setup";

test.describe.serial("Wallet UI", () => {
  const email = uniqueEmail();
  let walletId = "";

  test("register, login, and navigate to credentials", async ({ page }) => {
    await page.goto(WALLET_URL);

    // Fill login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to credentials screen
    await expect(page.locator("h1.section-title")).toContainText("Credentials");
    await expect(page.locator("nav")).toContainText("Wallet UI");

    // Extract wallet ID from localStorage
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

  test("navigate to Keys & DIDs page", async ({ page }) => {
    await page.click("nav button:has-text('Keys & DIDs')");
    await expect(page.locator("h1.section-title")).toContainText("Keys & DIDs");
    // Should show keys and DIDs sections
    await expect(page.locator("text=Keys")).toBeVisible();
    await expect(page.locator("text=DIDs")).toBeVisible();
  });

  test("navigate back to Credentials page", async ({ page }) => {
    await page.click("nav button:has-text('Credentials')");
    await expect(page.locator("h1.section-title")).toContainText("Credentials");
  });
});
```

- [ ] **Step 2: Run wallet tests to verify they fail/pass appropriately**

```bash
npx playwright test tests/wallet.spec.ts --project=chromium
```

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/wallet.spec.ts
git commit -m "feat: add wallet e2e tests (login, credentials, keys-dids)"
```

---

### Task 5: Add claim-offer and presentation page tests to wallet.spec.ts

**Files:**
- Modify: `e2e/tests/wallet.spec.ts`

- [ ] **Step 1: Append claim-offer and presentation tests**

Insert after the credentials test in `e2e/tests/wallet.spec.ts`, before the closing `});`:

```typescript
  test("navigate to Claim Offer page", async ({ page }) => {
    await page.click("nav button:has-text('Claim Offer')");
    await expect(page.locator("h1.section-title")).toContainText("Claim Credential Offer");
    // Verify the offer URI textarea is present
    await expect(
      page.locator('textarea[placeholder*="credential offer"]')
    ).toBeVisible();
    // Verify the claim button is present
    await expect(
      page.locator("button:has-text('Claim Credential')")
    ).toBeVisible();
  });

  test("navigate to Presentation page", async ({ page }) => {
    await page.click("nav button:has-text('Presentation')");
    await expect(page.locator("h1.section-title")).toContainText("Presentation Request");
    // Verify the auth request textarea and review button are present
    await expect(
      page.locator('textarea[placeholder*="authorization request"]')
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Review Request')")
    ).toBeVisible();
  });
```

- [ ] **Step 2: Run wallet tests**

```bash
npx playwright test tests/wallet.spec.ts --project=chromium
```
Expected: 5 tests pass (login, keys-dids, credentials, claim-offer, presentation).

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/wallet.spec.ts
git commit -m "feat: add wallet claim-offer and presentation page tests"
```

---

### Task 6: Write issuer.spec.ts

**Files:**
- Create: `e2e/tests/issuer.spec.ts`

- [ ] **Step 1: Write issuer tests**

File: `e2e/tests/issuer.spec.ts`
```typescript
import { test, expect } from "@playwright/test";
import { ISSUER_URL } from "../helpers/test-setup";

test.describe.serial("Issuer UI", () => {
  test("navigate to Dashboard and onboard mDoc (IACA + DS)", async ({ page }) => {
    await page.goto(ISSUER_URL);
    await expect(page.locator("h1.section-title")).toContainText("Dashboard");

    // Click the mDoc onboard button (first "Onboard" in the table)
    const mdocRow = page.locator("tr").filter({ hasText: "mDoc" });
    await mdocRow.locator("button:has-text('Onboard')").click();

    // Wait for success — the row status should change to "Ready"
    await expect(mdocRow.locator("td").nth(1)).toContainText("Ready", { timeout: 30000 });
    await expect(page.locator("text=mDoc onboarding complete")).toBeVisible();
  });

  test("onboard Issuer (SD-JWT / JWT VC)", async ({ page }) => {
    const issuerRow = page.locator("tr").filter({ hasText: "SD-JWT" });
    await issuerRow.locator("button:has-text('Onboard')").click();

    await expect(issuerRow.locator("td").nth(1)).toContainText("Ready", { timeout: 30000 });
    await expect(page.locator("text=Issuer onboarded")).toBeVisible();
  });

  test("issue mDoc credential", async ({ page }) => {
    await page.click("nav button:has-text('Issue Credential')");
    await expect(page.locator("h1.section-title")).toContainText("Issue Credential");

    // Select mDoc tab
    await page.click("button.format-tab:has-text('mDoc')");
    await expect(page.locator("button.format-tab.active")).toContainText("mDoc");

    // Click issue button
    await page.click("button:has-text('Issue MDOC Credential')");

    // Verify offer URI is generated
    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Credential offer created")).toBeVisible();
  });

  test("issue SD-JWT credential", async ({ page }) => {
    // Select SD-JWT tab
    await page.click("button.format-tab:has-text('SD-JWT')");
    await expect(page.locator("button.format-tab.active")).toContainText("SD-JWT");

    await page.click("button:has-text('Issue SD-JWT Credential')");

    await expect(page.locator("text=Credential Offer URI")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=Credential offer created")).toBeVisible();
  });

  test("view Offers page", async ({ page }) => {
    await page.click("nav button:has-text('Offers')");
    await expect(page.locator("h1.section-title")).toContainText("Active Offers");

    // Should have at least one offer from the previous tests
    const offers = page.locator(".card").filter({ hasText: /mDoc|SD-JWT|JWT VC/ });
    await expect(offers.first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run issuer tests**

```bash
npx playwright test tests/issuer.spec.ts --project=chromium
```
Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/issuer.spec.ts
git commit -m "feat: add issuer e2e tests (onboard, issue, offers)"
```

---

### Task 7: Write verifier.spec.ts

**Files:**
- Create: `e2e/tests/verifier.spec.ts`

- [ ] **Step 1: Write verifier tests**

File: `e2e/tests/verifier.spec.ts`
```typescript
import { test, expect } from "@playwright/test";
import { VERIFIER_URL } from "../helpers/test-setup";

test.describe.serial("Verifier UI", () => {
  test("create SD-JWT authorization request", async ({ page }) => {
    await page.goto(VERIFIER_URL);
    await expect(page.locator("h1.section-title")).toContainText("New Verification Request");

    // Should default to SD-JWT tab
    await expect(page.locator("button.format-tab.active")).toContainText("SD-JWT");

    // Select given_name and birthdate checkboxes (should already be checked)
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

  test("create mDoc authorization request", async ({ page }) => {
    // Click mDoc tab
    await page.click("button.format-tab:has-text('mDoc')");
    await expect(page.locator("button.format-tab.active")).toContainText("mDoc");

    // Paste a dummy IACA cert PEM (the test doesn't need a valid cert yet —
    // the API will validate; we just test the UI accepts input and calls the API)
    //
    // We need a real IACA PEM from the issuer. Since this test runs after the
    // issuer.spec.ts tests (which persist IACA PEM in localStorage), we can't
    // share that across ports. For verifier-only runs, we test the SD-JWT path
    // which doesn't need IACA PEM. The mDoc input validation (UI level) is
    // tested here: paste empty PEM → expect error toast.
    await page.click("button:has-text('Create Authorization Request')");

    // Should show error about missing IACA PEM
    await expect(page.locator("text=Paste the IACA certificate PEM")).toBeVisible();
  });

  test("view Sessions page", async ({ page }) => {
    await page.click("nav button:has-text('Sessions')");
    await expect(page.locator("h1.section-title")).toContainText("Verification Sessions");

    // Should have at least one session from the SD-JWT test
    await expect(page.locator("tr").filter({ hasText: "SD-JWT" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run verifier tests**

```bash
npx playwright test tests/verifier.spec.ts --project=chromium
```
Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/verifier.spec.ts
git commit -m "feat: add verifier e2e tests (create request, sessions)"
```

---

### Task 8: Write cross-ui.spec.ts

**Files:**
- Create: `e2e/tests/cross-ui.spec.ts`

- [ ] **Step 1: Write cross-UI integration test**

This test orchestrates the full SSI lifecycle across all three UIs. It uses separate pages for each UI.

File: `e2e/tests/cross-ui.spec.ts`
```typescript
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

    // Onboard mDoc
    const mdocRow = page.locator("tr").filter({ hasText: "mDoc" });
    await mdocRow.locator("button:has-text('Onboard')").click();
    await expect(mdocRow.locator("td").nth(1)).toContainText("Ready", { timeout: 30000 });

    // Extract IACA cert PEM from localStorage
    iacaCertPem = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("issuer_onboarding") || "{}");
      return state.iacaCertPem || "";
    });
    expect(iacaCertPem).toBeTruthy();

    // Issue mDoc credential
    await page.click("nav button:has-text('Issue Credential')");
    await page.click("button.format-tab:has-text('mDoc')");
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
    await expect(page.locator("h1.section-title")).toContainText("Credentials");

    // Navigate to Claim Offer
    await page.click("nav button:has-text('Claim Offer')");

    // Paste the offer URI and claim
    await page.fill('textarea[placeholder*="credential offer"]', offerUri);
    await page.click("button:has-text('Claim Credential')");

    // Verify success
    await expect(page.locator("text=Credential claimed")).toBeVisible({ timeout: 30000 });

    await page.close();
  });

  test("verifier: create mDoc auth request with IACA cert", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(VERIFIER_URL);

    // Switch to mDoc tab
    await page.click("button.format-tab:has-text('mDoc')");

    // Paste IACA cert PEM
    await page.fill("textarea", iacaCertPem);

    // Select fields
    const familyName = page.locator("label").filter({ hasText: "family_name" }).locator("input[type='checkbox']");
    const givenName = page.locator("label").filter({ hasText: "given_name" }).locator("input[type='checkbox']");
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

    // Already logged in from previous step? No — this is a new browser context.
    // We need to log in again.
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1.section-title")).toContainText("Credentials");

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
```

- [ ] **Step 2: Run cross-ui tests**

```bash
npx playwright test tests/cross-ui.spec.ts --project=chromium
```
Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/cross-ui.spec.ts
git commit -m "feat: add cross-UI SSI lifecycle e2e test"
```

---

### Task 9: Install Playwright browsers

**Files:** none (browser binaries only)

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium firefox
```
Expected: Downloads Chrome and Firefox browsers to `~/.cache/ms-playwright/`.

- [ ] **Step 2: Verify installation**

```bash
npx playwright install --list | grep -E "chromium|firefox"
```
Expected: Shows paths for `chromium-*` and `firefox-*`.

---

### Task 10: Full suite run with Ralph Loop

- [ ] **Step 1: Start backends (Docker) and Vite dev servers**

```bash
# Terminal 1: Start Docker services
cd docker-compose && docker compose up -d

# Terminal 2: Start all three Vite dev servers
cd local-ui-cc/wallet-ui && npx vite --host --port 5173 &
cd local-ui-cc/issuer-ui && npx vite --host --port 5174 &
cd local-ui-cc/verifier-ui && npx vite --host --port 5175 &
```

- [ ] **Step 2: Run the full suite**

```bash
npx playwright test
```
Expected: All tests pass across chromium and firefox.
- wallet.spec.ts: 5 tests × 2 browsers = 10
- issuer.spec.ts: 5 tests × 2 browsers = 10
- verifier.spec.ts: 3 tests × 2 browsers = 6
- cross-ui.spec.ts: 4 tests × 2 browsers = 8
Total: 34 passed, 0 failed.

- [ ] **Step 3: If any tests fail, fix and re-run**

Ralph Loop cycles:
```bash
npx playwright test  # run → fix → run → fix → ... → all green
```

- [ ] **Step 4: Push to remote**

```bash
git push origin local-test-cc
```
