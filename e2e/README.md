# Walt.id Identity — E2E Tests

Playwright end-to-end tests for the `local-ui-cc` Vite apps (wallet, issuer, verifier).

## Prerequisites

- Docker backends running on ports 7001 (wallet), 7002 (issuer), 7003 (verifier)
- Vite dev servers running on ports 5173 (wallet), 5174 (issuer), 5175 (verifier)
- Or use `../local-ui-cc/start-all.sh` to start everything

## Quick Start

```bash
cd e2e
npm install
npx playwright install chromium firefox

# Run all tests
npx playwright test

# Specific modes
npm run test:ui       # interactive UI
npm run test:headed   # headed browsers
npm run report        # view HTML report
```

> NOTE: run from within `e2e/` so Playwright resolves the config correctly. From the repo root use:
> ```bash
> e2e/node_modules/.bin/playwright test --config=e2e/playwright.config.ts
> ```

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `tests/wallet.spec.ts` | 5 | Wallet UI: login, credentials, keys/DIDs, claim offer, presentation |
| `tests/issuer.spec.ts` | 5 | Issuer UI: onboard mDoc & SD-JWT, issue credentials, view offers |
| `tests/verifier.spec.ts` | 3 | Verifier UI: create SD-JWT & mDoc auth requests, view sessions |
| `tests/cross-ui.spec.ts` | 4 | Full SSI lifecycle: issuer → wallet claim → verifier request → wallet present |

## Browsers

- Chromium — always
- Firefox — always
- WebKit — disabled (requires `sudo npx playwright install-deps` for `libavif16`)

## Architecture

- Each file uses `test.describe.serial` with a shared `page` created via `test.beforeAll({ browser })`
- Single-UI tests share one browser page for the whole file (login state persists)
- Cross-UI test creates a fresh page per step (different ports)
- Test data: unique email per run via `helpers/test-setup.ts`, password `test123`
- Real Docker backends required — no mocking

## Test Details

### wallet.spec.ts

```
Register (idempotent) → Login → Get wallet ID → Credentials screen
  → Keys & DIDs screen (verify tables render)
  → Credentials screen (back navigation)
  → Claim Offer screen (verify input + button)
  → Presentation screen (verify input + button)
```

### issuer.spec.ts

```
Dashboard:
  → Onboard mDoc (IACA + DS) → verify "Ready" status
  → Onboard Issuer (SD-JWT) → verify DID
Issue Credential:
  → Issue mDoc credential → verify offer URI
  → Issue SD-JWT credential → verify offer URI
Offers page:
  → Verify issued offers appear
```

### verifier.spec.ts

```
New Request:
  → SD-JWT tab (default): check fields, create request, verify URL
  → mDoc tab: submit without IACA PEM, verify error
Sessions:
  → Verify sessions from previous requests appear
```

### cross-ui.spec.ts

```
Issuer (port 5174):
  1. Onboard mDoc → extract IACA cert PEM
  2. Issue mDoc credential → extract offer URI

Wallet (port 5173):
  3. Login → paste offer URI → claim → verify "Credential claimed"

Verifier (port 5175):
  4. Paste IACA PEM → create mDoc auth request → extract auth URL

Wallet (port 5173):
  5. Login → paste auth URL → review → verify "Approve & Present"
```

## Configuration

`playwright.config.ts`:
- `timeout: 60s`, `expect.timeout: 15s`
- `fullyParallel: true` (files run in parallel, tests within a file are serial)
- CI: `webServer` auto-starts Vite, `retries: 2`, `workers: 1`
- Local: servers must be started manually
