# Local Test UI Apps — Design Spec

**Date**: 2026-05-29
**Status**: Approved

## Overview

Three standalone Vite/React SPA apps for local testing and demonstration of the Walt.id Identity Stack credential flows. Each app maps to one role (Wallet, Issuer, Verifier), supports all three credential formats (mDoc, SD-JWT VC, JWT VC/VP), and calls the same backend APIs exercised by the shell scripts in `local-test/`.

**Backend services** (Docker Compose):

| Service | Port |
|---------|------|
| wallet-api | 7001 |
| issuer-api | 7002 |
| verifier-api (v1) | 7003 |

**Credential formats supported by all three apps**:

| Format | Issuance endpoint | Verification profile |
|--------|-------------------|---------------------|
| mDoc (ISO 18013-5 mDL) | `/openid4vc/mdoc/issue` | ISO_18013_7_MDOC |
| SD-JWT VC | `/openid4vc/sdjwt/issue` | vc+sd-jwt with PE |
| JWT VC/VP (W3C) | `/openid4vc/jwt/issue` | jwt_vc_json with PE |

## Architecture

Three independent Vite/React apps co-located under `local-test/`:

```
local-test/
  wallet-ui/     (Vite/React, port 5173)
  issuer-ui/     (Vite/React, port 5174)
  verifier-ui/   (Vite/React, port 5175)
  start-all.sh   (starts all three dev servers)
```

Each app is fully standalone — own `package.json`, own `vite.config.ts`, own `src/`. Shared conventions but no shared package dependency. Each app has its own `src/api/` directory with typed fetch functions for the backend service it talks to.

### Why standalone

- No monorepo tooling overhead
- Each app runs independently on its own port
- Easy to modify one without rebuilding others
- Follows the existing pattern in `local-test/` where each script is self-contained
- Conventions (API pattern, token storage, type names) keep consistency without tooling

## Wallet App (`wallet-ui`)

### Screens

| Screen | Purpose |
|--------|---------|
| Login | Email + password login or registration. POST `/auth/register` or `/auth/login`. Stores token in localStorage. |
| Credentials Dashboard | Lists all held credentials with format badge (mDoc/SD-JWT/JWT), issuer info, dates. Data from GET `/wallet/accounts/wallets`. |
| Claim Credential | Text input for offer URI. POST `/exchange/useOfferRequest`. Shows success with new credential details. |
| Verification Request | Paste auth request URL. App resolves, matches credentials, shows what fields will be shared, user approves, then fulfills. Uses POST `/exchange/resolvePresentationRequest` → POST `/exchange/matchCredentialsForPresentationDefinition` → POST `/exchange/usePresentationRequest`. |
| Keys & DIDs | Read-only table showing wallet keys (GET `/wallet/{id}/keys`) and DIDs (GET `/wallet/{id}/dids`). |

### Verification flow (semi-automated)

1. User pastes auth request URL into the app
2. App resolves the request (`resolvePresentationRequest`)
3. App matches credentials (`matchCredentialsForPresentationDefinition`)
4. App shows a confirmation screen: which credential, which fields will be shared
5. User reviews and approves
6. App fulfills the presentation (`usePresentationRequest`)

### API client (`src/api/wallet-api.ts`)

All calls go to `http://localhost:7001/wallet-api`. Auth token attached as `Authorization: Bearer <token>` from localStorage. Docker hostname rewriting: `localhost` → `host.docker.internal` for URLs sent to the wallet-api (which runs inside Docker).

## Issuer App (`issuer-ui`)

### Screens

| Screen | Purpose |
|--------|---------|
| Dashboard / Onboarding | Shows onboarding status for each format. mDoc: IACA cert + DS cert status. SD-JWT/JWT VC: key + DID status. Button to onboard if not configured. |
| Issue Credential | Format selector (mDoc/SD-JWT/JWT VC). Format-specific data entry form: mDoc has namespace fields, SD-JWT has flat key-value + SD toggles per field, JWT VC has credential type + JSON body. POST to the appropriate `/openid4vc/{format}/issue` endpoint. |
| Generated Offer | After issuance: displays offer URI with copy button. Shows offer content via GET `/credentialOffer?id=`. |
| Active Offers | History of previously generated offers with IDs and timestamps. |

### Onboarding per format

- **mDoc**: POST `/onboard/iso-mdl/iacas` → POST `/onboard/iso-mdl/document-signers` (IACA cert then DS cert)
- **SD-JWT / JWT VC**: POST `/onboard/issuer` (generates key + DID)

Onboarding state is stored in localStorage so the app remembers it across restarts. The app does not persist onboarding to the backend — it's re-done if localStorage is cleared.

### API client (`src/api/issuer-api.ts`)

All calls go to `http://localhost:7002`. No auth required (issuer-api is unauthenticated in local setup).

## Verifier App (`verifier-ui`)

### Screens

| Screen | Purpose |
|--------|---------|
| New Request | Format selector (mDoc/SD-JWT/JWT VC). Format-specific request builder: mDoc has namespace field picker + trusted_root_cas, SD-JWT has JSON path fields + vp_policies, JWT VC has credential type + format. POST `/openid4vc/verify` with appropriate headers. |
| Generated Request | Auth request URL with copy button. Ready to paste into the Wallet app. |
| Sessions | Table of all verification sessions (stored in localStorage). Each row: format, state ID, timestamp, status. Click to poll GET `/openid4vc/session/{state}` and see full result. |

### Request builder per format

- **mDoc**: Uses namespace paths like `$['org.iso.18013.5.1']['family_name']`, `openid_profile: "ISO_18013_7_MDOC"`, `responseMode: direct_post_jwt`, `trusted_root_cas` from IACA cert PEM
- **SD-JWT**: Uses JSON paths like `$.birthdate`, format `vc+sd-jwt`, `vp_policies: ["signature_sd-jwt-vc"]`, `responseMode: direct_post`
- **JWT VC**: Uses credential type like `UniversityDegree`, format `jwt_vc_json`, `responseMode: direct_post`

### API client (`src/api/verifier-api.ts`)

All calls go to `http://localhost:7003`. No auth required. Key headers: `authorizeBaseUrl`, `responseMode`, `openId4VPProfile` (for mdoc).

## Shared Conventions

### TypeScript types

Each app defines the same core types:

```typescript
type CredentialFormat = 'mdoc' | 'sd-jwt' | 'jwt-vc';

interface CredentialCard {
  id: string;
  format: CredentialFormat;
  type: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
}
```

### Token storage

- Key: `wallet_token` in localStorage
- Set on login/register, cleared on logout
- Only wallet app uses it; issuer and verifier don't need auth

### Docker hostname rewriting

Same pattern as shell scripts: when sending a URL to the wallet-api (which runs in Docker), rewrite `localhost` → `host.docker.internal`. When fetching a URL from the host (issuer-api or verifier-api responses), rewrite `host.docker.internal` → `localhost`.

### Error handling

- API errors shown as dismissible toast notifications
- Form validation inline before submission
- Network errors caught and displayed with retry option

### Styling

Minimal CSS — no component library. Clean, functional design focused on daily operations. Each app self-contained with its own styles.

## Non-goals

- No production deployment — these are local development/demo tools
- No persistence beyond localStorage (sessions, offer history, onboarding state)
- No responsive/mobile design (desktop-only)
- No wallet-api database backup or migration
- No verifier-api2 (port 7004) support — uses verifier-api v1 only, matching the shell scripts
- No multi-account/wallet switching

## Dependencies (per app)

- React 18+
- Vite 5+
- TypeScript
- No additional runtime dependencies (no UI library, no router — simple state-based navigation is sufficient for 4-5 screens each)
