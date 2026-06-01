# Walt.id Identity — E2E Playwright Test Suite Design

**Date:** 2026-06-01
**Status:** Approved

## Goal

Add Playwright end-to-end tests covering all core user flows across the three `local-ui-cc` Vite apps (wallet, issuer, verifier), plus one cross-UI integration flow that exercises the full SSI credential lifecycle.

Tests run against real backend Docker services (wallet-api:7001, issuer:7002, verifier:7003). Ralph Loop drives the development loop: write test → run → fix → re-run until all pass.

## Directory Structure

```
e2e/
├── package.json
├── playwright.config.ts
├── helpers/
│   └── test-setup.ts
└── tests/
    ├── wallet.spec.ts
    ├── issuer.spec.ts
    ├── verifier.spec.ts
    └── cross-ui.spec.ts
```

## Core Flows

### wallet.spec.ts

1. **Login flow** — register (idempotent) → login → retrieve wallet ID → navigates to Credentials screen
2. **Keys/DIDs page** — navigate to KeysDIDs screen, verify content renders
3. **Claim Offer page** — navigate to ClaimOffer screen, verify the offer URL input is present
4. **Presentation page** — navigate to Presentation screen, verify the auth-request input is present

File uses `test.describe.serial` to share login state across tests via Playwright's storageState or a shared `page` fixture.

### issuer.spec.ts

1. **Onboard mDoc** — click Onboard IACA+DS → verify "Ready" status appears
2. **Onboard Issuer** — click Onboard Issuer → verify DID appears
3. **Issue mDoc credential** — navigate to Issue Credential, select mDoc format, fill fields, submit → verify success toast
4. **Issue SD-JWT credential** — same flow for SD-JWT format
5. **View Offers** — navigate to Offers screen, verify issued credential offer appears

File uses `test.describe.serial` because step 3-4 depend on step 1-2 onboarding state.

### verifier.spec.ts

1. **Create SD-JWT auth request** — select SD-JWT tab, pick fields, submit → verify URL is generated
2. **Create mDoc auth request** — paste IACA cert PEM, select mDoc tab, pick fields, submit → verify URL is generated
3. **View Sessions** — navigate to Sessions screen, verify previously created sessions appear

File uses `test.describe.serial` to share the IACA cert PEM obtained from the first test run.

### cross-ui.spec.ts

Full SSI lifecycle, crossing all three UIs:

1. **Issuer onboards mDoc** → copies IACA cert PEM
2. **Issuer issues mDoc credential** → obtains offer URL
3. **Wallet logs in** → navigates to Claim Offer → pastes offer URL → credential appears in list
4. **Verifier creates mDoc auth request** (with IACA cert) → obtains auth request URL
5. **Wallet navigates to Presentation** → pastes auth request URL → sees success response

This is a `test.describe.serial` block that orchestrates multiple browser contexts/pages across the three ports.

## Playwright Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| `fullyParallel` | true | Files run in parallel |
| `retries` | 0 | Fast failure during dev loop; CI can override |
| `workers` | 3 | One per file |
| `timeout` | 60000 | Backend calls can be slow |
| `browsers` | chromium, firefox | WebKit disabled (missing libavif16) |
| `webServer` | CI-only | Local dev starts servers manually |

## Data Strategy

- Each spec file is self-contained with its own setup
- wallet.spec.ts: registers a test user (idempotent), shares login state within the file
- issuer.spec.ts: onboards within the file, state persisted via the app's own localStorage
- verifier.spec.ts: creates its own requests, sessions stored in localStorage
- cross-ui.spec.ts: orchestrates the full flow across ports, passing data (IACA PEM, URLs) between browser contexts manually

No test database seeding required — the apps' idempotent registration and onboarding APIs serve as de-facto setup.

## Ralph Loop Development Workflow

```
For each spec file:
  1. Write tests
  2. npx playwright test <spec>
  3. If failures → analyze → fix code or test → goto 2
  4. If all pass → move to next spec
  5. After all specs: npx playwright test (full suite)
```

Ralph Loop automates the iterative cycle of step 2-3 per spec file, keeping the loop tight until the file is green.

## Non-Goals

- Visual regression / screenshot testing
- Performance testing
- API-level testing (focus is UI + integration)
- Cross-browser WebKit support (until system deps are installed)
- Testing the Python-based `local-ui` HTML pages (out of scope)
