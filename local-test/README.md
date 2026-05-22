# Local Test Scripts

End-to-end test scripts for the Walt.id Identity Stack running locally via Docker Compose.

## Prerequisites

- Docker Compose stack running (`docker-compose/docker-compose.yaml`)
- `curl`, `jq`, `python3` available on PATH

Start a clean stack:

```bash
bash local-test/start-fresh.sh
```

---

## `test-mdoc-flow.sh` — ISO 18013-5 mDL end-to-end test

Tests the full **mobile Driver's Licence (mDL)** issuance and verification flow using OID4VCI and OID4VP (ISO 18013-7 profile).

### Usage

```bash
cd local-test
bash test-mdoc-flow.sh [email] [password]
# defaults: test@email.com / test
```

### Step-by-step breakdown

| Step | Description |
|------|-------------|
| 0 | Register wallet account (skips if already exists) |
| 1 | Login and obtain bearer token |
| 2 | Retrieve wallet ID |
| 3 | Create IACA (Issuing Authority CA) key and certificate via `POST /onboard/iso-mdl/iacas` |
| 4 | Create Document Signer (DS) key and certificate via `POST /onboard/iso-mdl/document-signers` |
| 5 | Fetch issuer `/.well-known/openid-configuration` |
| 6 | Issue mDL credential offer via `POST /openid4vc/mdoc/issue` — `x5Chain` contains the DS cert only; IACA goes in `trusted_root_cas` at verification time |
| 7 | Inspect the raw credential offer |
| 8 | Claim the credential into the wallet via `POST /wallet/{id}/exchange/useOfferRequest` |
| 9 | Create an OID4VP authorization request via `POST /openid4vc/verify` using Presentation Exchange and `ISO_18013_7_MDOC` profile |
| 10 | Decode the request JWT to extract `presentation_definition`; match wallet credentials |
| 11 | Resolve the presentation request in the wallet (`resolvePresentationRequest`) |
| 12 | Fulfill the presentation request (`usePresentationRequest`) |
| 13 | Poll verifier session and assert `verificationResult == true` |

### Service ports

| Service | Port |
|---------|------|
| wallet-api | 7001 |
| issuer-api | 7002 |
| verifier-api (v1) | 7003 |
| verifier-api2 | 7004 |

> **Note — verifier-api2 incompatibility:** verifier-api2 (port 7004) uses DCQL queries (`dcql_query`) instead of Presentation Exchange (`presentation_definition`). The wallet-api's `resolvePresentationRequest` and `usePresentationRequest` endpoints only support Presentation Exchange, so this script uses verifier-api v1 (port 7003).

### Key implementation details

- **`x5Chain`** in the issuance payload must contain **only the DS certificate** (single entry). The IACA certificate is passed separately as `trusted_root_cas` to the verifier.
- The credential offer URL uses `localhost` (issuer's perspective), but it is rewritten to `host.docker.internal` before being sent to the wallet-api, which runs inside Docker.
- The presentation request URL (`request_uri`) is also rewritten from `host.docker.internal` → `localhost` when fetching the request JWT directly from the host.
- Step 10 uses a Python snippet to base64-decode the JWT payload with a `zlib` deflate fallback and gracefully returns `{}` on any error, falling back to the claimed credential ID.

---

## `test-vc-vp-flow.sh` — W3C VC/VP end-to-end test

Tests W3C Verifiable Credential issuance and Verifiable Presentation verification.

### Usage

```bash
cd local-test
bash test-vc-vp-flow.sh
```

---

## `start-fresh.sh`

Tears down the Docker Compose stack, wipes wallet data, and restarts everything from a clean state.

```bash
bash local-test/start-fresh.sh
```
