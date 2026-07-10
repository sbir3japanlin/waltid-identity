# Verifier API Integration Package — Design Spec

**Date:** 2026-07-10
**Status:** Approved

## Goal

Create a self-contained integration package that lets an external developer:
1. Deploy verifier-api locally as a standalone Docker container (no caddy, no wallet/issuer)
2. Understand the verifier API surface
3. Integrate verifier-api into their own wallet/issuer ecosystem
4. Verify an SD-JWT VC end-to-end using runnable example scripts

## Directory Structure

```
integration/
├── README.md                      # Overview, prerequisites, quick start
├── docker-compose.yaml            # Standalone verifier (single service, no caddy)
├── config/                        # Verifier config files
│   ├── verifier-service.conf
│   ├── web.conf
│   └── _features.conf
├── api-reference.md               # Complete verifier API reference
├── examples/
│   ├── bash/
│   │   ├── verify-sd-jwt.sh       # Full flow with mock wallet
│   │   └── common.sh              # Shared helpers (colors, logging, HTTP)
│   └── python/
│       ├── verify_sd_jwt.py       # Full flow with mock wallet
│       └── verifier_client.py     # Reusable VerifierClient class
└── scripts/
    └── start-verifier.sh          # Pull image, start container, wait for health
```

## Component Details

### 1. `README.md`

Audience: external developer seeing the package for the first time.

Sections:
- What this package is (one paragraph)
- Prerequisites (Docker, curl, jq, python3 — bash only needs curl+jq)
- Quick start: `bash scripts/start-verifier.sh && bash examples/bash/verify-sd-jwt.sh`
- Directory map (what each file does)
- How to integrate: narrative walkthrough referencing the commented stubs in example scripts
- Troubleshooting (port conflicts, Docker not running)

### 2. `docker-compose.yaml`

Single service, no profiles, no caddy:

```yaml
services:
  verifier-api:
    image: waltid/verifier-api:stable
    pull_policy: missing
    ports:
      - "7003:7003"
    volumes:
      - ./config:/waltid-verifier-api/config
```

No extra_hosts needed (no Docker-in-Docker routing). No depends_on. The verifier stores sessions in memory — fully stateless.

### 3. `config/`

Three files, minimal content:

- `verifier-service.conf`: `baseUrl = "http://localhost:7003"`
- `web.conf`: `webHost = "0.0.0.0"` / `webPort = "7003"`
- `_features.conf`: enable `dev-mode` (for DID:JWK resolution without HTTPS)

### 4. `api-reference.md`

Documents every verifier endpoint:

| Endpoint | Method | Description |
|---|---|---|
| `/openid4vc/verify` | POST | Create OID4VP authorization request |
| `/openid4vc/pd/{id}` | GET | Fetch Presentation Definition |
| `/openid4vc/session/{state}` | GET | Poll verification result |
| `/openid4vc/verify/response` | POST | Direct-post response endpoint (wallet posts VP token here) |

Each endpoint documented with:
- Request headers (especially `authorizeBaseUrl`, `responseMode`)
- Request body schema
- Response schema
- Error responses
- Example curl

Also documents:
- `vp_policies` options (`signature_sd-jwt-vc`, `signature_jwt-vc`, `presentation-definition`, etc.)
- `vc_policies` options (`not-before`, `expired`, `schema`, etc.)
- Session lifecycle (created on verify, updated on VP token receipt, polled for result)

### 5. Example Scripts

#### Bash: `verify-sd-jwt.sh`

Three clear phases with header banners:

**Phase A — Create verification request:**
```
POST /openid4vc/verify
  → returns openid4vp:// URI with state, nonce, presentation_definition_uri
```

**Phase B — Mock wallet resolves and fulfills:**
```
1. Fetch presentation definition from pd URI
2. Construct a hardcoded SD-JWT VC (matching real walt.id output)
3. Create selective disclosures for requested fields
4. Sign KB-JWT with a hardcoded holder key
5. POST vp_token to response_uri
```

Phase B is a self-contained function that simulates what the customer's wallet would do. The hardcoded SD-JWT VC is annotated to show structure. Comments at the top of the function say "Replace this function with a call to your wallet's presentation endpoint."

**Phase C — Poll result:**
```
GET /openid4vc/session/{state}
  → assert verificationResult == true
```

#### Bash: `common.sh`

Shared utilities extracted from `test-sd-jwt-flow.sh`:
- Color definitions (auto-disabled for non-TTY)
- `step()`, `ok()`, `info()`, `fail()` functions
- `vlog_step()` for verbose request/response logging
- `--verbose` flag support
- jq/curl dependency checks

#### Python: `verifier_client.py`

```python
class VerifierClient:
    def __init__(self, base_url: str = "http://localhost:7003")
    def create_verification_request(credentials, vp_policies, vc_policies) -> dict
    def get_presentation_definition(pd_id: str) -> dict
    def get_session(state: str) -> dict
```

Returns typed dicts. Handles URL parsing (extracting state, nonce, pd_uri from the `openid4vp://` response).

#### Python: `verify_sd_jwt.py`

Same three-phase flow as the bash script, using `VerifierClient`. The mock wallet is a separate `MockWallet` class with:
- `resolve_request(auth_request_uri: str)` — fetches PD, constructs VP
- Hardcoded SD-JWT VC and holder key
- `create_vp_token(presentation_definition, credential)` — selective disclosure + KB-JWT

Integration point: `MockWallet` is clearly documented as "Replace with your wallet implementation."

### 6. `scripts/start-verifier.sh`

```bash
#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d
# Wait for verifier to be healthy
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:7003/openid4vc/verify; then
    echo "Verifier API ready at http://localhost:7003"
    exit 0
  fi
  sleep 1
done
echo "ERROR: Verifier API did not become healthy" >&2
exit 1
```

## What We Don't Include

- No wallet-api or issuer-api — the customer brings their own
- No OPA server — policies are configured via `vp_policies`/`vc_policies` in the request body
- No persistent storage — sessions are in-memory, no database needed
- No authentication on verifier endpoints — verifier is a public-facing RP
- No Python dependency beyond stdlib — `verifier_client.py` uses only `urllib`, `json`, `base64`

## Source of Truth

- `docker-compose/docker-compose.yaml` — image name, port, volume mount pattern
- `docker-compose/verifier-api/config/` — config file format and values
- `local-test/test-sd-jwt-flow.sh` — API call patterns, request/response shapes
- `local-test/test-sd-jwt-flow.md` — detailed request/response schemas
