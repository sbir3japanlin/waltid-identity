# Verifier API Examples

Python example script demonstrating the OID4VP verification flow end-to-end
using a mock wallet. The script is self-contained — no external wallet or
issuer required.

## Files

```
examples/
├── readme.md                    # This file
└── python/
    ├── verifier_client.py      # Reusable Python client library (stdlib only)
    └── verify_sd_jwt.py        # Python example script
```

## Prerequisites

| Dependency | Install |
|---|---|
| Docker + Docker Compose | [docker.com](https://docs.docker.com/get-docker/) |
| Python 3.9+ with `cryptography` | `pip install cryptography` |

## Quick Start

```bash
# From the vp-verifier/ directory
bash scripts/start-verifier.sh

# Run the example
python3 examples/python/verify_sd_jwt.py
```

---

## Flow Overview (3 Phases)

The script follows the OID4VP direct_post flow:

```
┌──────────────────────────────────────────────────────────────────────┐
│  PHASE A: Create Verification Request                                │
│                                                                      │
│  Your App ──POST /openid4vc/verify──▶ Verifier API                   │
│                    │                                                 │
│                    ▼                                                 │
│  Returns: openid4vp://authorize?response_type=vp_token&...           │
│           state=<state>&nonce=<nonce>&                               │
│           presentation_definition_uri=<pd_uri>&                      │
│           response_uri=<response_uri>&client_id=<client_id>          │
├──────────────────────────────────────────────────────────────────────┤
│  PHASE B: Mock Wallet                                                │
│                                                                      │
│  Wallet ──GET <pd_uri>──▶ Verifier (fetch Presentation Definition)   │
│  Wallet generates SD-JWT VC + KB-JWT + disclosures                   │
│  Wallet ──POST <response_uri>──▶ Verifier (submit VP token)          │
│      Body (form-encoded): vp_token, presentation_submission, state   │
├──────────────────────────────────────────────────────────────────────┤
│  PHASE C: Poll Verification Result                                   │
│                                                                      │
│  Your App ──GET /openid4vc/session/{state}──▶ Verifier               │
│                    │                                                 │
│                    ▼                                                 │
│  Returns: { "verificationResult": "true"|"false", ... }              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Walkthrough

### Setup

```
Hardcoded default: VERIFIER_API = "http://localhost:7003"
CLI flag: --verbose (prints PD, response details, and mock wallet internals)
```

### Phase A — Create Verification Request

**API call:** `POST /openid4vc/verify`

**Input (JSON body):**
```json
{
  "request_credentials": [
    {
      "format": "vc+sd-jwt",
      "input_descriptor": {
        "id": "identity-credential-request",
        "format": { "vc+sd-jwt": {} },
        "constraints": {
          "fields": [
            { "path": ["$.birthdate"], "filter": { "type": "string", "pattern": ".*" } },
            { "path": ["$.given_name"], "filter": { "type": "string", "pattern": ".*" } }
          ],
          "limit_disclosure": "required"
        }
      }
    }
  ],
  "vp_policies": ["signature_sd-jwt-vc"],
  "vc_policies": ["not-before", "expired"]
}
```

**Input (headers):**
| Header | Value | Purpose |
|---|---|---|
| `authorizeBaseUrl` | `openid4vp://authorize` | Base URI scheme for the auth request |
| `responseMode` | `direct_post` | Wallet POSTs VP token directly to verifier |
| `Content-Type` | `application/json` | Request body format |

**Output:** Auth URI string, parsed via `urllib.parse.urlparse` + `parse_qs` into:
`state`, `nonce`, `pd_uri` (presentation_definition_uri), `response_uri`, `client_id`.

**Verification point:** `state` must be non-empty (`fail()` otherwise, line 301).

---

### Phase B — Mock Wallet

**Step 1:** GET `pd_uri` → parse JSON → extract `pd["id"]` and
`pd["input_descriptors"][0]["id"]` (lines 332-333).

**Step 2:** Instantiate `MockWallet()` which generates:
- Issuer EC P-256 key → `did:jwk` + kid
- Holder EC P-256 key → JWK + kid
- SD-JWT VC with selective-disclosure claims (see Mock Wallet Internals below)
- Disclosures for `birthdate` and `family_name`

**Step 3:** `wallet.create_vp_token(nonce, client_id)` assembles:
```
<SD-JWT-VC>~<KB-JWT>~
```

**Step 4:** POST to `response_uri` with form-encoded body (per OID4VP direct_post):
```python
urlencode({
    "vp_token": vp_token,
    "presentation_submission": json.dumps({
        "id": f"ps-{token_hex(8)}",
        "definition_id": pd_id,
        "descriptor_map": [{"id": input_desc_id, "format": "vc+sd-jwt", "path": "$"}],
    }),
    "state": state,
})
```

**Verification point:** `urllib.request.urlopen` raises `HTTPError` on non-2xx.
Success is a 2xx response (line 355).

---

### Phase C — Poll Verification Result

**API call:** `GET /openid4vc/session/{state}`

**Output:** Session JSON:
```json
{
  "id": "<state>",
  "presentationDefinition": { ... },
  "verificationResult": "true" | "false",
  ...
}
```

**Verification point:** `result["verificationResult"]` must equal `"true"`
(line 374). Prints `Verification SUCCESS` or `Verification failed: <value>`.

**Integration notes** (always printed, even on failure):
- Issuer DID
- VCT (Verifiable Credential Type)
- Holder key type (EC P-256)
- Credential format (vc+sd-jwt)

With `--verbose`, also prints issuer JWK, holder JWK, full SD-JWT VC token, and
all disclosures.

---

## VerifierClient (Python Library)

`verifier_client.py` is a reusable client library (stdlib only, no `cryptography`
required). It wraps the API calls into typed methods.

### Classes

**`AuthRequest`** — parsed OID4VP authorization request URI.
```python
@dataclass
class AuthRequest:
    uri: str                           # Full URI string
    state: str                         # Session state token
    nonce: str                         # Replay protection nonce
    presentation_definition_uri: str   # Where to fetch the PD
    response_uri: str                  # Where to POST the VP token
    client_id: str                     # Verifier's client ID
    response_mode: str                 # "direct_post"

    @classmethod
    def parse(cls, uri: str) -> AuthRequest: ...
```

**`VerificationResult`** — session poll result.
```python
@dataclass
class VerificationResult:
    session_id: str                    # Session/state ID
    verification_result: bool          # True = passed
    policy_results: dict               # Per-policy pass/fail
    raw: dict                          # Full response JSON
```

**`VerifierClient`** — main API client.
```python
class VerifierClient:
    def __init__(self, base_url: str = "http://localhost:7003"): ...

    def create_verification_request(
        self,
        credentials: list[dict],
        vp_policies: list[str] | None = None,
        vc_policies: list[str] | None = None,
        *,
        authorize_base_url: str = "openid4vp://authorize",
        response_mode: str = "direct_post",
    ) -> AuthRequest: ...

    def get_presentation_definition(self, pd_id: str) -> dict: ...
    def get_session(self, state: str) -> VerificationResult: ...
    def get_presentation_definition_from_uri(self, pd_uri: str) -> dict: ...
```

### Usage Example

```python
from verifier_client import VerifierClient

client = VerifierClient("http://localhost:7003")

# Phase A
auth = client.create_verification_request(
    credentials=[{
        "format": "vc+sd-jwt",
        "input_descriptor": {
            "id": "my-request",
            "format": {"vc+sd-jwt": {}},
            "constraints": {
                "fields": [
                    {"path": ["$.birthdate"], "filter": {"type": "string", "pattern": ".*"}},
                ],
                "limit_disclosure": "required",
            },
        },
    }],
    vp_policies=["signature_sd-jwt-vc"],
    vc_policies=["not-before", "expired"],
)

# Phase B — your wallet uses auth.state, auth.nonce, auth.presentation_definition_uri
# and posts the VP token to auth.response_uri

# Phase C
result = client.get_session(auth.state)
print(result.verification_result)  # True or False
```

---

## Verification Points Summary

| Phase | Check | Line |
|---|---|---|
| A — Auth Request | `state` extracted and non-empty | 301 |
| B — PD Fetch | PD response contains `.id` and `.input_descriptors` | 332-333 |
| B — VP Token | Token length > 0 | 326 |
| B — VP Submit | POST to response_uri returns 2xx | 355 |
| C — Poll | `$.verificationResult == "true"` | 374 |

---

## Input Parameters Reference

### `POST /openid4vc/verify`

| Field | Type | Required | Description |
|---|---|---|---|
| `request_credentials` | array | Yes | Credential types the verifier should request |
| `request_credentials[].format` | string | Yes | Credential format: `"vc+sd-jwt"`, `"jwt_vc_json"`, `"mso_mdoc"` |
| `request_credentials[].input_descriptor` | object | Yes | PE 2.0 input descriptor |
| `request_credentials[].input_descriptor.id` | string | Yes | Unique descriptor ID |
| `request_credentials[].input_descriptor.format` | object | Yes | Format constraints (e.g. `{"vc+sd-jwt": {}}`) |
| `request_credentials[].input_descriptor.constraints.fields` | array | Yes | Claim paths to request |
| `request_credentials[].input_descriptor.constraints.fields[].path` | array | Yes | JSONPath expressions (e.g. `["$.birthdate"]`) |
| `request_credentials[].input_descriptor.constraints.fields[].filter` | object | No | Pattern/type filter |
| `request_credentials[].input_descriptor.constraints.limit_disclosure` | string | No | `"required"` or `"preferred"` |
| `vp_policies` | array | No | VP-level verification policies |
| `vc_policies` | array | No | VC-level verification policies |

### VP Policies (Common)

| Policy | Description |
|---|---|
| `signature_sd-jwt-vc` | Verify SD-JWT VC signature and key binding |
| `signature_jwt-vc` | Verify JWT VC signature |

### VC Policies (Common)

| Policy | Description |
|---|---|
| `not-before` | Check `nbf` claim is in the past |
| `expired` | Check `exp` claim is in the future |
| `schema` | Validate credential against a schema |
| `revocation` | Check revocation status |

### `POST /openid4vc/verify/{state}` (VP Token Submission)

| Field | Type | Required | Description |
|---|---|---|---|
| `vp_token` | string | Yes | Assembled SD-JWT VP token |
| `presentation_submission` | string (JSON) | Yes | Descriptor mapping (see below) |
| `state` | string | Yes | State from Phase A |

### `presentation_submission` Structure

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique submission ID (e.g. `"ps-<random>"`) |
| `definition_id` | string | Must match `pd.id` from the Presentation Definition |
| `descriptor_map` | array | Maps input descriptors to credential paths |
| `descriptor_map[].id` | string | Must match an `input_descriptors[].id` from the PD |
| `descriptor_map[].format` | string | Credential format: `"vc+sd-jwt"` |
| `descriptor_map[].path` | string | JSONPath to the credential in the VP token (`"$"`) |

---

## Mock Wallet Internals

### Keys

| Key | Algorithm | Curve | Purpose |
|---|---|---|---|
| Issuer key | ES256 | P-256 (secp256r1) | Signs the SD-JWT VC |
| Holder key | ES256 | P-256 (secp256r1) | Signs the KB-JWT (key binding proof) |

### SD-JWT VC Structure

```
<Header>.<Payload>.<Signature>~<Disclosure1>~<Disclosure2>
```

- **Header:** `{"alg": "ES256", "kid": "<did:jwk>#<sha256-of-jwk>", "typ": "vc+sd-jwt"}`
- **Payload:** Always-visible claims + `_sd` (array of disclosure hashes) + `_sd_alg`
- **Disclosures:** `[<salt>, <claim-name>, <claim-value>]` — base64url-encoded, `~`-separated
- **Disclosures are sorted** (SD-JWT convention for deterministic order)

### KB-JWT Structure

```
<Header>.<Payload>.<Signature>
```

- **Header:** `{"alg": "ES256", "kid": "<holder-kid>", "typ": "vc+sd-jwt"}`
- **Payload:** `aud` (client_id), `nonce`, `iat`, `sd_hash` (SHA-256 of concatenated disclosures)

### VP Token Assembly

```
<SD-JWT-VC>~<KB-JWT>~
```
- The trailing `~` is the SD-JWT convention indicating no more disclosures follow the KB-JWT.

### Selective Disclosure Claims

| Claim | Value |
|---|---|
| `birthdate` | `1940-01-01` |
| `family_name` | `Doe` |

### Always-Visible Claims

| Claim | Value |
|---|---|
| `given_name` | `John` |
| `email` | `johndoe@example.com` |
| `phone_number` | `+1-202-555-0101` |
| `address.street_address` | `123 Main St` |
| `address.locality` | `Anytown` |
| `address.region` | `Anystate` |
| `address.country` | `US` |
| `is_over_18` | `true` |
| `is_over_21` | `true` |
| `is_over_65` | `true` |
| `vct` | `http://localhost:7002/identity_credential` |

---

## Integrating Into Your Project

### What to Keep

- **`verifier_client.py`** — drop it into your project as-is (stdlib only, no deps).
- The **OID4VP flow logic** — the 3-phase pattern (create → present → poll) is universal.

### What to Replace

The `MockWallet` class simulates a wallet holding credentials. In your
application, replace it with:
1. Your wallet's credential store (already-issued SD-JWT VCs)
2. Your wallet's holder key (for KB-JWT signing)
3. Your own disclosure selection logic

### Key Integration Point

```python
# Instead of:
wallet = MockWallet()
vp_token = wallet.create_vp_token(nonce, client_id)

# Your wallet:
vp_token = my_wallet.create_vp(
    credential_id="user-credential-1",
    nonce=nonce,
    aud=client_id,
    disclosed_claims=["birthdate", "family_name"],
)
```

The rest of the flow (auth request creation, PD fetching, result polling)
stays the same.
