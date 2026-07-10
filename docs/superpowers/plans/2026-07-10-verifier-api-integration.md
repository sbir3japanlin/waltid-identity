# Verifier API Integration Package — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a self-contained `integration/` directory with standalone verifier deployment, API reference docs, and runnable example scripts (bash + Python) for integrating verifier-api into a customer project.

**Architecture:** The package is pure documentation + scripts — no build step. A single docker-compose file deploys the verifier standalone (no caddy). Example scripts use a mock wallet that generates valid SD-JWT VCs dynamically, so they run end-to-end with zero external services beyond the verifier container. Python scripts use the `cryptography` library for EC key operations; bash scripts use a temporary Python script (quoted heredoc) for crypto operations.

**Tech Stack:** Docker Compose, bash (curl + jq), Python 3 (stdlib + `cryptography`), EC P-256 (secp256r1 / ES256)

---

### Task 1: Create integration directory and verifier config files

**Files:**
- Create: `integration/config/verifier-service.conf`
- Create: `integration/config/web.conf`
- Create: `integration/config/_features.conf`
- Create: `integration/config/dev-mode.conf`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p integration/config integration/examples/bash integration/examples/python integration/scripts
```

- [ ] **Step 2: Write verifier-service.conf**

```
baseUrl = "http://localhost:7003"
```

- [ ] **Step 3: Write web.conf**

```
webHost = "0.0.0.0"
webPort = "7003"
```

- [ ] **Step 4: Write _features.conf**

```
enabledFeatures = [
    dev-mode
]
disabledFeatures = [
]
```

- [ ] **Step 5: Write dev-mode.conf**

```
enableDidWebResolverHttps=false
```

- [ ] **Step 6: Commit**

```bash
git add integration/config/
git commit -m "feat: add verifier-api standalone config files

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Create standalone docker-compose.yaml

**Files:**
- Create: `integration/docker-compose.yaml`

- [ ] **Step 1: Write docker-compose.yaml**

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

No caddy, no profiles, no extra_hosts, no depends_on. The verifier is stateless (in-memory sessions).

- [ ] **Step 2: Commit**

```bash
git add integration/docker-compose.yaml
git commit -m "feat: add standalone verifier docker-compose

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Create start-verifier.sh

**Files:**
- Create: `integration/scripts/start-verifier.sh`

- [ ] **Step 1: Write start-verifier.sh**

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INTEGRATION_DIR="$(dirname "$SCRIPT_DIR")"

cd "$INTEGRATION_DIR"

echo "Pulling waltid/verifier-api:stable..."
docker compose pull

echo "Starting verifier-api..."
docker compose up -d

echo "Waiting for verifier-api to become healthy..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '%{http_code}' http://localhost:7003/openid4vc/verify 2>/dev/null | grep -qE '^(200|400|404)'; then
    echo ""
    echo "Verifier API is ready at http://localhost:7003"
    echo ""
    echo "Run an example:"
    echo "  bash examples/bash/verify-sd-jwt.sh"
    echo "  python3 examples/python/verify_sd_jwt.py"
    exit 0
  fi
  printf "."
  sleep 1
done

echo ""
echo "ERROR: Verifier API did not become healthy within 30 seconds" >&2
echo "Check logs: docker compose logs verifier-api" >&2
exit 1
```

- [ ] **Step 2: Make executable**

```bash
chmod +x integration/scripts/start-verifier.sh
```

- [ ] **Step 3: Commit**

```bash
git add integration/scripts/start-verifier.sh
git commit -m "feat: add verifier startup script with health check

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Create bash shared utilities

**Files:**
- Create: `integration/examples/bash/common.sh`

- [ ] **Step 1: Write common.sh**

```bash
#!/bin/bash
# Shared utilities for verifier-api example scripts

set -euo pipefail

VERIFIER_API="${VERIFIER_API:-http://localhost:7003}"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
[ -t 1 ] || { RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; NC=''; }

step()   { echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}"; }
ok()     { echo -e "${GREEN}✓${NC} $1"; }
info()   { echo -e "${YELLOW}→${NC} $1"; }
fail()   { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Dependency check ─────────────────────────────────────────────────────────
check_deps() {
  command -v jq    >/dev/null 2>&1 || fail "jq is required. Install with: apt install jq"
  command -v curl  >/dev/null 2>&1 || fail "curl is required."
  python3 -c "from cryptography.hazmat.primitives.asymmetric import ec" 2>/dev/null \
    || fail "Python cryptography library required. Install with: pip install cryptography"
  python3 -c "import cbor2" 2>/dev/null \
    || true  # optional, only needed for ISO 18013-5 flows
}

# ── Verbose logging ──────────────────────────────────────────────────────────
VLOG_TMP=$(mktemp)
VLOG_COUNT=0

vlog() {
  local method="$1" url="$2" req="$3" res="$4"
  VLOG_COUNT=$((VLOG_COUNT + 1))
  if ${VERBOSE:-false}; then
    echo -e "\n${YELLOW}  ┌── HTTP $VLOG_COUNT ─── $method $url${NC}"
    if [[ -n "$req" ]]; then
      echo -e "${YELLOW}  │  REQUEST:${NC}"
      (echo "$req" | jq . 2>/dev/null || echo "$req") | head -60 | sed 's/^/  │   /'
    fi
    echo -e "${YELLOW}  │  RESPONSE:${NC}"
    (echo "$res" | jq . 2>/dev/null || echo "$res") | head -60 | sed 's/^/  │   /'
    echo -e "${YELLOW}  └──${NC}"
  fi
  jq -cn --arg i "$VLOG_COUNT" --arg m "$method" --arg u "$url" \
         --arg req "$req" --arg res "$res" \
    '{step:$i,method:$m,url:$u,request:$req,response:$res}' >> "$VLOG_TMP"
}

# ── Parse openid4vp:// URI ───────────────────────────────────────────────────
# Extracts query parameters from an openid4vp:// URI.
# Usage: parse_auth_uri "$URI"
# Sets globals: AUTH_STATE, AUTH_NONCE, AUTH_PD_URI, AUTH_RESPONSE_URI, AUTH_CLIENT_ID
parse_auth_uri() {
  local uri="$1"
  AUTH_STATE=$(echo "$uri" | grep -oE 'state=[^&]+' | head -1 | cut -d= -f2-)
  AUTH_NONCE=$(echo "$uri" | grep -oE 'nonce=[^&]+' | head -1 | cut -d= -f2-)
  AUTH_PD_URI=$(echo "$uri" | grep -oE 'presentation_definition_uri=[^&]+' | cut -d= -f2-)
  AUTH_RESPONSE_URI=$(echo "$uri" | grep -oE 'response_uri=[^&]+' | cut -d= -f2-)
  AUTH_CLIENT_ID=$(echo "$uri" | grep -oE 'client_id=[^&]+' | head -1 | cut -d= -f2-)

  # URL-decode values
  AUTH_PD_URI=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$AUTH_PD_URI")
  AUTH_RESPONSE_URI=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$AUTH_RESPONSE_URI")
  AUTH_CLIENT_ID=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$AUTH_CLIENT_ID")
  AUTH_NONCE=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$AUTH_NONCE")
  AUTH_STATE=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$AUTH_STATE")
}
```

No shebang — this file is sourced, not executed.

- [ ] **Step 2: Commit**

```bash
git add integration/examples/bash/common.sh
git commit -m "feat: add bash shared utilities for verifier examples

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Create bash verify-sd-jwt.sh

**Files:**
- Create: `integration/examples/bash/verify-sd-jwt.sh`

- [ ] **Step 1: Write verify-sd-jwt.sh**

```bash
#!/bin/bash
# Verifier API Integration — SD-JWT VC Verification Example (bash)
#
# Demonstrates the OID4VP verification flow using the walt.id verifier-api.
# The mock wallet generates a valid SD-JWT VC and presents it to the verifier,
# simulating what your wallet application would do.
#
# Prerequisites:
#   bash scripts/start-verifier.sh
#   pip install cryptography
#
# Usage:
#   ./verify-sd-jwt.sh [--verbose|-v]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

VERBOSE=false
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=true ;;
  esac
done

check_deps

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE A: Create Verification Request (Verifier API)
# ═══════════════════════════════════════════════════════════════════════════════

step "Create OID4VP Authorization Request"

AUTH_REQUEST=$(curl -s -X POST "$VERIFIER_API/openid4vc/verify" \
  -H 'accept: */*' \
  -H 'authorizeBaseUrl: openid4vp://authorize' \
  -H 'responseMode: direct_post' \
  -H 'Content-Type: application/json' \
  -d '{
    "request_credentials": [
      {
        "format": "vc+sd-jwt",
        "input_descriptor": {
          "id": "identity-credential-request",
          "format": {"vc+sd-jwt": {}},
          "constraints": {
            "fields": [
              {
                "path": ["$.birthdate"],
                "filter": {"type": "string", "pattern": ".*"}
              },
              {
                "path": ["$.given_name"],
                "filter": {"type": "string", "pattern": ".*"}
              }
            ],
            "limit_disclosure": "required"
          }
        }
      }
    ],
    "vp_policies": ["signature_sd-jwt-vc"],
    "vc_policies": ["not-before", "expired"]
  }')

info "Auth request: ${AUTH_REQUEST:0:80}..."
vlog "POST" "$VERIFIER_API/openid4vc/verify" \
  '{"request_credentials":[...],"vp_policies":["signature_sd-jwt-vc"],"vc_policies":["not-before","expired"]}' \
  "$AUTH_REQUEST"

parse_auth_uri "$AUTH_REQUEST"
[[ -n "$AUTH_STATE" ]] || fail "Could not extract state from auth request"
ok "State: $AUTH_STATE"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE B: Mock Wallet — Resolve and Fulfill Presentation
# ═══════════════════════════════════════════════════════════════════════════════
#
# INTEGRATION POINT:
# In your application, replace this entire phase with calls to your wallet.
# Your wallet should:
#   1. Parse the openid4vp:// URI (see parse_auth_uri in common.sh)
#   2. Fetch the Presentation Definition from AUTH_PD_URI
#   3. Match credentials against the definition
#   4. Create a VP token with selective disclosures
#   5. POST the VP token to AUTH_RESPONSE_URI
#
# The code below simulates these steps using a mock SD-JWT VC.

step "Mock Wallet: Fetch Presentation Definition"

PD_URI="${AUTH_PD_URI}"
info "PD URI: $PD_URI"

PRESENTATION_DEF=$(curl -s "$PD_URI")
echo "$PRESENTATION_DEF" | jq .
vlog "GET" "$PD_URI" "" "$PRESENTATION_DEF"

step "Mock Wallet: Generate SD-JWT VC and Create VP Token"

# The mock wallet uses Python with the cryptography library to:
# 1. Generate issuer and holder EC P-256 key pairs
# 2. Build an SD-JWT VC with selective disclosures for birthdate and family_name
# 3. Sign the SD-JWT with the issuer key
# 4. Create a KB-JWT signed with the holder key
# 5. Assemble the VP token and POST to the verifier
#
# In your application, your wallet already has the credential and keys.
# You would skip the generation steps and go directly to VP creation.

_CRYPTO_PY=$(mktemp)
cat > "$_CRYPTO_PY" << 'PYEOF'
import json, sys, time, hashlib, base64, secrets
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes

def b64url(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def b64url_decode(s):
    padding = 4 - len(s) % 4
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s)

def sign_jwt(payload, key, kid):
    header = json.dumps({'alg': 'ES256', 'kid': kid, 'typ': 'vc+sd-jwt'})
    signing_input = b64url(header) + '.' + b64url(json.dumps(payload))
    sig = key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256()))
    return signing_input + '.' + b64url(sig)

def to_jwk(pub_key):
    nums = pub_key.public_numbers()
    return {
        'kty': 'EC', 'crv': 'P-256',
        'x': b64url(nums.x.to_bytes(32, 'big')),
        'y': b64url(nums.y.to_bytes(32, 'big'))
    }

def serialize_private(key):
    return key.private_numbers().private_value.to_bytes(32, 'big').hex()

def load_private(hex_str):
    return ec.derive_private_key(int.from_bytes(bytes.fromhex(hex_str), 'big'), ec.SECP256R1())

# ── Generate keys ──
issuer_key = ec.generate_private_key(ec.SECP256R1())
holder_key = ec.generate_private_key(ec.SECP256R1())
issuer_jwk = to_jwk(issuer_key.public_key())
issuer_kid = b64url(hashlib.sha256(json.dumps(issuer_jwk).encode()).digest())
holder_jwk = to_jwk(holder_key.public_key())
holder_kid = b64url(hashlib.sha256(json.dumps(holder_jwk).encode()).digest())
issuer_did = 'did:jwk:' + b64url(json.dumps(issuer_jwk))

# ── Build SD-JWT VC ──
iat = int(time.time())
exp = iat + 365 * 86400
sd_claims = {
    'birthdate': '1940-01-01',
    'family_name': 'Doe'
}

sd_hashes = []
disclosures = []
for name, value in sd_claims.items():
    salt = secrets.token_hex(16)
    disc = json.dumps([salt, name, value])
    disclosures.append(disc)
    sd_hashes.append(b64url(hashlib.sha256(disc.encode()).digest()))

# Sort disclosures for deterministic order (SD-JWT convention)
disclosures.sort()

jwt_payload = {
    'given_name': 'John',
    'email': 'johndoe@example.com',
    'phone_number': '+1-202-555-0101',
    'address': {
        'street_address': '123 Main St',
        'locality': 'Anytown',
        'region': 'Anystate',
        'country': 'US'
    },
    'is_over_18': True,
    'is_over_21': True,
    'is_over_65': True,
    'id': 'urn:uuid:' + secrets.token_hex(16),
    'iat': iat,
    'nbf': iat,
    'exp': exp,
    '_sd_alg': 'sha-256',
    'iss': issuer_did,
    'cnf': {'jwk': holder_jwk},
    'vct': 'http://localhost:7002/identity_credential',
    '_sd': sd_hashes
}

sd_jwt_vc = sign_jwt(jwt_payload, issuer_key, issuer_did + '#' + issuer_kid)
for d in disclosures:
    sd_jwt_vc += '~' + b64url(d)

# ── Create KB-JWT ──
nonce = sys.argv[1]
aud = sys.argv[2]

# Compute sd_hash: SHA-256 of concatenated disclosures (no delimiters)
sd_hash_input = ''.join(disclosures)
sd_hash = b64url(hashlib.sha256(sd_hash_input.encode()).digest())

kb_payload = {
    'aud': aud,
    'nonce': nonce,
    'iat': iat,
    'sd_hash': sd_hash
}
kb_jwt = sign_jwt(kb_payload, holder_key, holder_kid)

# ── Assemble VP token ──
vp_token = sd_jwt_vc + kb_jwt + '~'

# Output holder key info for the integration notes
print(json.dumps({
    'vp_token': vp_token,
    'holder_key': serialize_private(holder_key),
    'issuer_did': issuer_did,
    'vct': jwt_payload['vct']
}))
PYEOF
VP_TOKEN=$(python3 "$_CRYPTO_PY" "$AUTH_NONCE" "$AUTH_CLIENT_ID")
rm -f "$_CRYPTO_PY"
VP_TOKEN=$(echo "$VP_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['vp_token'])")
info "VP token created (${#VP_TOKEN} chars)"

step "Mock Wallet: POST VP Token to Verifier"

RESPONSE_URI=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$AUTH_RESPONSE_URI")
info "Response URI: $RESPONSE_URI"

VP_RESPONSE=$(curl -s -X POST "$RESPONSE_URI" \
  -H 'Content-Type: application/json' \
  -d "{\"vp_token\": \"$VP_TOKEN\", \"state\": \"$AUTH_STATE\"}")
echo "$VP_RESPONSE" | jq . 2>/dev/null || echo "$VP_RESPONSE"
vlog "POST" "$RESPONSE_URI" "{\"vp_token\":\"...\",\"state\":\"$AUTH_STATE\"}" "$VP_RESPONSE"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE C: Poll Verification Result
# ═══════════════════════════════════════════════════════════════════════════════

step "Poll Verification Result"

VERIFICATION=$(curl -s -X GET "$VERIFIER_API/openid4vc/session/$AUTH_STATE" \
  -H 'accept: */*')
echo "$VERIFICATION" | jq .
vlog "GET" "$VERIFIER_API/openid4vc/session/$AUTH_STATE" "" "$VERIFICATION"

VERIFY_RESULT=$(echo "$VERIFICATION" | jq -r '.verificationResult // empty')
if [[ "$VERIFY_RESULT" == "true" ]]; then
  ok "Verification SUCCESS"
else
  fail "Verification failed: $VERIFY_RESULT"
fi

echo -e "\n${BOLD}${GREEN}SD-JWT VC verification completed successfully.${NC}"

# Clean up
rm -f "$VLOG_TMP"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x integration/examples/bash/verify-sd-jwt.sh
```

- [ ] **Step 3: Commit**

```bash
git add integration/examples/bash/verify-sd-jwt.sh
git commit -m "feat: add bash SD-JWT verification example with mock wallet

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Create Python verifier client library

**Files:**
- Create: `integration/examples/python/verifier_client.py`

- [ ] **Step 1: Write verifier_client.py**

```python
"""
Verifier API client library.

Provides a clean Python interface to the walt.id verifier-api for
OID4VP (OpenID for Verifiable Presentations) verification flows.

Usage:
    from verifier_client import VerifierClient

    client = VerifierClient("http://localhost:7003")
    auth_uri = client.create_verification_request(
        credentials=[{
            "format": "vc+sd-jwt",
            "input_descriptor": { ... }
        }],
        vp_policies=["signature_sd-jwt-vc"],
        vc_policies=["not-before", "expired"]
    )
    # Parse auth_uri, present credential, then:
    result = client.get_session(auth_uri.state)
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AuthRequest:
    """Parsed OID4VP authorization request URI."""

    uri: str
    state: str
    nonce: str
    presentation_definition_uri: str
    response_uri: str
    client_id: str
    response_mode: str = "direct_post"

    @classmethod
    def parse(cls, uri: str) -> AuthRequest:
        """Parse an openid4vp:// URI into its components."""
        parsed = urllib.parse.urlparse(uri)
        params = urllib.parse.parse_qs(parsed.query)

        def first(key: str) -> str:
            return params.get(key, [""])[0]

        return cls(
            uri=uri,
            state=first("state"),
            nonce=first("nonce"),
            presentation_definition_uri=first("presentation_definition_uri"),
            response_uri=first("response_uri"),
            client_id=first("client_id"),
            response_mode=first("response_mode") or "direct_post",
        )


@dataclass
class VerificationResult:
    """Result of a verification session."""

    session_id: str
    verification_result: bool
    policy_results: dict[str, bool] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)


class VerifierClient:
    """Client for the walt.id verifier-api.

    The verifier-api is stateless — sessions are stored in memory and
    expire when the container stops. No authentication is required.
    """

    def __init__(self, base_url: str = "http://localhost:7003"):
        self.base_url = base_url.rstrip("/")

    def _post(self, path: str, body: dict, headers: dict | None = None) -> str:
        """Make a POST request and return the response body as a string."""
        all_headers = {"Content-Type": "application/json"}
        if headers:
            all_headers.update(headers)

        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers=all_headers,
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode("utf-8")

    def _get(self, path: str) -> str:
        """Make a GET request and return the response body as a string."""
        with urllib.request.urlopen(f"{self.base_url}{path}") as resp:
            return resp.read().decode("utf-8")

    def create_verification_request(
        self,
        credentials: list[dict[str, Any]],
        vp_policies: list[str] | None = None,
        vc_policies: list[str] | None = None,
        *,
        authorize_base_url: str = "openid4vp://authorize",
        response_mode: str = "direct_post",
    ) -> AuthRequest:
        """Create an OID4VP authorization request.

        Args:
            credentials: List of credential request objects. Each must have
                ``format`` and ``input_descriptor`` keys.
            vp_policies: VP-level policies. Common values:
                ``"signature_sd-jwt-vc"``, ``"signature_jwt-vc"``.
            vc_policies: VC-level policies. Common values:
                ``"not-before"``, ``"expired"``, ``"schema"``.
            authorize_base_url: Base URL for the authorization request.
                Default is ``"openid4vp://authorize"``.
            response_mode: Response mode. ``"direct_post"`` means the wallet
                POSTs the VP token directly to the verifier.

        Returns:
            Parsed ``AuthRequest`` with the state, nonce, PD URI, and response URI.

        Example:
            >>> client = VerifierClient()
            >>> auth = client.create_verification_request(
            ...     credentials=[{
            ...         "format": "vc+sd-jwt",
            ...         "input_descriptor": {
            ...             "id": "my-request",
            ...             "format": {"vc+sd-jwt": {}},
            ...             "constraints": {
            ...                 "fields": [{
            ...                     "path": ["$.given_name"],
            ...                     "filter": {"type": "string", "pattern": ".*"}
            ...                 }],
            ...                 "limit_disclosure": "required"
            ...             }
            ...         }
            ...     }],
            ...     vp_policies=["signature_sd-jwt-vc"],
            ...     vc_policies=["not-before", "expired"]
            ... )
        """
        body: dict[str, Any] = {
            "request_credentials": credentials,
        }
        if vp_policies:
            body["vp_policies"] = vp_policies
        if vc_policies:
            body["vc_policies"] = vc_policies

        headers = {
            "authorizeBaseUrl": authorize_base_url,
            "responseMode": response_mode,
        }

        uri = self._post("/openid4vc/verify", body, headers)
        return AuthRequest.parse(uri)

    def get_presentation_definition(self, pd_id: str) -> dict[str, Any]:
        """Fetch a Presentation Definition by ID.

        Args:
            pd_id: The presentation definition ID from the auth request.
                This is the path segment after ``/openid4vc/pd/``.

        Returns:
            Presentation Definition JSON object (PE 2.0 format).
        """
        body = self._get(f"/openid4vc/pd/{pd_id}")
        return json.loads(body)

    def get_session(self, state: str) -> VerificationResult:
        """Poll a verification session for its result.

        Call this after the wallet has posted the VP token to the
        ``response_uri``. The session tracks whether verification passed.

        Args:
            state: The state token from the auth request.

        Returns:
            ``VerificationResult`` with ``verification_result`` as a bool.
        """
        body = self._get(f"/openid4vc/session/{state}")
        data = json.loads(body)
        return VerificationResult(
            session_id=data.get("id", state),
            verification_result=data.get("verificationResult") == "true",
            policy_results=data.get("policyResults", {}),
            raw=data,
        )

    def get_presentation_definition_from_uri(self, pd_uri: str) -> dict[str, Any]:
        """Fetch a Presentation Definition from a full URI.

        Convenience method — extracts the PD ID from the URI and calls
        ``get_presentation_definition``.

        Args:
            pd_uri: Full presentation definition URI (as returned in auth request).
        """
        # Extract the last path segment as the PD ID
        parsed = urllib.parse.urlparse(pd_uri)
        pd_id = parsed.path.rstrip("/").rsplit("/", 1)[-1]
        return self.get_presentation_definition(pd_id)
```

This uses only Python stdlib — no external dependencies. No `cryptography` needed here.

- [ ] **Step 2: Commit**

```bash
git add integration/examples/python/verifier_client.py
git commit -m "feat: add Python verifier client library (stdlib only)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Create Python verify_sd_jwt.py

**Files:**
- Create: `integration/examples/python/verify_sd_jwt.py`

- [ ] **Step 1: Write verify_sd_jwt.py**

```python
#!/usr/bin/env python3
"""
Verifier API Integration — SD-JWT VC Verification Example (Python)

Demonstrates the OID4VP verification flow using the walt.id verifier-api.
The mock wallet generates a valid SD-JWT VC dynamically and presents it
to the verifier — no external wallet or issuer needed.

Prerequisites:
    pip install cryptography
    bash scripts/start-verifier.sh

Usage:
    python3 verify_sd_jwt.py [--verbose]
"""

import sys
import json
import time
import hashlib
import base64
import secrets
import urllib.request
from typing import Any

# ── Crypto imports ──────────────────────────────────────────────────────────
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes


def b64url(data: bytes | str) -> str:
    """Base64url-encode data (no padding)."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(s: str) -> bytes:
    """Base64url-decode a string (adds padding if needed)."""
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def to_jwk(public_key: ec.EllipticCurvePublicKey) -> dict[str, str]:
    """Convert an EC public key to JWK format."""
    nums = public_key.public_numbers()
    return {
        "kty": "EC",
        "crv": "P-256",
        "x": b64url(nums.x.to_bytes(32, "big")),
        "y": b64url(nums.y.to_bytes(32, "big")),
    }


def to_jwk_private(key: ec.EllipticCurvePrivateKey) -> dict[str, str]:
    """Convert an EC private key to JWK format (includes 'd')."""
    pub = to_jwk(key.public_key())
    nums = key.private_numbers()
    pub["d"] = b64url(nums.private_value.to_bytes(32, "big"))
    return pub


def sign_jwt(
    payload: dict[str, Any], key: ec.EllipticCurvePrivateKey, kid: str
) -> str:
    """Create a compact JWS with ES256 signature."""
    header = json.dumps({"alg": "ES256", "kid": kid, "typ": "vc+sd-jwt"})
    signing_input = f"{b64url(header)}.{b64url(json.dumps(payload))}"
    sig = key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256()))
    return f"{signing_input}.{b64url(sig)}"


# ═══════════════════════════════════════════════════════════════════════════════
# Mock Wallet — SD-JWT VC Generation
# ═══════════════════════════════════════════════════════════════════════════════
#
# INTEGRATION POINT:
# In your application, you would replace this class with calls to your wallet.
# Your wallet already holds the user's credentials (SD-JWT VCs issued by your
# issuer) and cryptographic keys. The mock wallet below generates everything
# from scratch so the example runs with zero external dependencies.
#
# The key operations your wallet must perform:
#   1. Parse the OID4VP authorization request URI
#   2. Fetch the Presentation Definition
#   3. Match credentials against the definition's input descriptors
#   4. Create a VP token: select disclosures, build KB-JWT, sign with holder key
#   5. POST the VP token to the verifier's response_uri


class MockWallet:
    """Simulates a wallet for demonstration purposes.

    Generates fresh keys and a valid SD-JWT VC on initialization.
    In a real application, these would come from your wallet's storage.
    """

    def __init__(self):
        # Generate issuer key (in reality, your issuer signs the credential)
        self.issuer_key = ec.generate_private_key(ec.SECP256R1())
        issuer_jwk = to_jwk(self.issuer_key.public_key())
        self.issuer_kid = b64url(hashlib.sha256(
            json.dumps(issuer_jwk).encode()
        ).digest())
        self.issuer_did = f"did:jwk:{b64url(json.dumps(issuer_jwk))}"

        # Generate holder key (your wallet's actual key)
        self.holder_key = ec.generate_private_key(ec.SECP256R1())
        holder_jwk = to_jwk(self.holder_key.public_key())
        self.holder_kid = b64url(hashlib.sha256(
            json.dumps(holder_jwk).encode()
        ).digest())

        # Build the SD-JWT VC
        self._build_credential(holder_jwk)

    def _build_credential(self, holder_jwk: dict[str, str]):
        """Build an SD-JWT VC with selective disclosure claims."""
        iat = int(time.time())
        exp = iat + 365 * 86400  # 1 year

        # Claims with selective disclosure (sd: true)
        sd_claims = {
            "birthdate": "1940-01-01",
            "family_name": "Doe",
        }

        # Generate disclosures and their hashes
        self.disclosures: list[str] = []
        sd_hashes: list[str] = []
        for name, value in sd_claims.items():
            salt = secrets.token_hex(16)
            disc = json.dumps([salt, name, value])
            self.disclosures.append(disc)
            sd_hashes.append(b64url(hashlib.sha256(disc.encode()).digest()))

        # Sort disclosures (SD-JWT convention for deterministic order)
        self.disclosures.sort()

        # Always-visible claims
        jwt_payload = {
            "given_name": "John",
            "email": "johndoe@example.com",
            "phone_number": "+1-202-555-0101",
            "address": {
                "street_address": "123 Main St",
                "locality": "Anytown",
                "region": "Anystate",
                "country": "US",
            },
            "is_over_18": True,
            "is_over_21": True,
            "is_over_65": True,
            "id": f"urn:uuid:{secrets.token_hex(16)}",
            "iat": iat,
            "nbf": iat,
            "exp": exp,
            "_sd_alg": "sha-256",
            "iss": self.issuer_did,
            "cnf": {"jwk": holder_jwk},
            "vct": "http://localhost:7002/identity_credential",
            "_sd": sd_hashes,
        }

        # Sign the SD-JWT
        self.sd_jwt_vc = sign_jwt(
            jwt_payload, self.issuer_key, f"{self.issuer_did}#{self.issuer_kid}"
        )
        # Append disclosures
        for d in self.disclosures:
            self.sd_jwt_vc += f"~{b64url(d)}"

    def create_vp_token(self, nonce: str, aud: str) -> str:
        """Create a Verifiable Presentation token.

        Assembles: <SD-JWT>~<disclosure1>~<disclosure2>~...~<KB-JWT>~

        Args:
            nonce: The nonce from the verifier's auth request (replay protection).
            aud: The audience (verifier's client_id).

        Returns:
            A compact SD-JWT VP token string.
        """
        # Compute sd_hash over all disclosed claims
        sd_hash_input = "".join(self.disclosures)
        sd_hash = b64url(hashlib.sha256(sd_hash_input.encode()).digest())

        # Build and sign KB-JWT
        kb_payload = {
            "aud": aud,
            "nonce": nonce,
            "iat": int(time.time()),
            "sd_hash": sd_hash,
        }
        kb_jwt = sign_jwt(kb_payload, self.holder_key, self.holder_kid)

        # Assemble: SD-JWT VC + all disclosures + KB-JWT
        vp_token = self.sd_jwt_vc + kb_jwt + "~"
        return vp_token


# ═══════════════════════════════════════════════════════════════════════════════
# Main Flow
# ═══════════════════════════════════════════════════════════════════════════════

VERIFIER_API = "http://localhost:7003"
VERBOSE = "--verbose" in sys.argv


def log(msg: str):
    """Print a log message."""
    print(f"  → {msg}")


def ok(msg: str):
    """Print a success message."""
    print(f"  ✓ {msg}")


def fail(msg: str):
    """Print a failure message and exit."""
    print(f"  ✗ {msg}")
    sys.exit(1)


def section(title: str):
    """Print a section header."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def main():
    print("SD-JWT VC Verification Example")
    print(f"Verifier API: {VERIFIER_API}")

    # ── Phase A: Create Verification Request ──────────────────────────────────
    section("Phase A: Create Verification Request")

    request_body = {
        "request_credentials": [
            {
                "format": "vc+sd-jwt",
                "input_descriptor": {
                    "id": "identity-credential-request",
                    "format": {"vc+sd-jwt": {}},
                    "constraints": {
                        "fields": [
                            {
                                "path": ["$.birthdate"],
                                "filter": {"type": "string", "pattern": ".*"},
                            },
                            {
                                "path": ["$.given_name"],
                                "filter": {"type": "string", "pattern": ".*"},
                            },
                        ],
                        "limit_disclosure": "required",
                    },
                },
            }
        ],
        "vp_policies": ["signature_sd-jwt-vc"],
        "vc_policies": ["not-before", "expired"],
    }

    req = urllib.request.Request(
        f"{VERIFIER_API}/openid4vc/verify",
        data=json.dumps(request_body).encode(),
        headers={
            "Content-Type": "application/json",
            "authorizeBaseUrl": "openid4vp://authorize",
            "responseMode": "direct_post",
        },
        method="POST",
    )

    with urllib.request.urlopen(req) as resp:
        auth_uri = resp.read().decode()

    log(f"Auth request: {auth_uri[:100]}...")

    # Parse the auth URI
    from urllib.parse import urlparse, parse_qs

    parsed = urlparse(auth_uri)
    params = parse_qs(parsed.query)

    def first(key):
        return params.get(key, [""])[0]

    state = first("state")
    nonce = first("nonce")
    pd_uri = first("presentation_definition_uri")
    response_uri = first("response_uri")
    client_id = first("client_id")

    if not state:
        fail("Could not extract state from auth request")
    ok(f"State: {state}")

    if VERBOSE:
        log(f"Nonce: {nonce}")
        log(f"PD URI: {pd_uri}")
        log(f"Response URI: {response_uri}")
        log(f"Client ID: {client_id}")

    # ── Phase B: Mock Wallet ──────────────────────────────────────────────────
    section("Phase B: Mock Wallet — Fetch PD and Create VP Token")

    # Fetch Presentation Definition
    log(f"Fetching Presentation Definition: {pd_uri}")
    with urllib.request.urlopen(pd_uri) as resp:
        pd = json.loads(resp.read())

    if VERBOSE:
        print(json.dumps(pd, indent=2))

    # Initialize mock wallet and create VP token
    log("Generating mock SD-JWT VC and creating VP token...")
    wallet = MockWallet()
    vp_token = wallet.create_vp_token(nonce, client_id)
    ok(f"VP token created ({len(vp_token)} chars)")

    # POST VP token to verifier
    log(f"Posting VP token to: {response_uri}")
    vp_body = json.dumps({"vp_token": vp_token, "state": state}).encode()

    req = urllib.request.Request(
        response_uri,
        data=vp_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        post_result = resp.read().decode()

    if VERBOSE:
        print(f"Response: {post_result}")
    ok("VP token submitted")

    # ── Phase C: Poll Verification Result ─────────────────────────────────────
    section("Phase C: Poll Verification Result")

    session_url = f"{VERIFIER_API}/openid4vc/session/{state}"
    log(f"Checking session: {session_url}")

    with urllib.request.urlopen(session_url) as resp:
        result = json.loads(resp.read())

    print(json.dumps(result, indent=2))

    verify_result = result.get("verificationResult")
    if verify_result == "true":
        ok("Verification SUCCESS")
    else:
        fail(f"Verification failed: {verify_result}")

    # ── Integration Notes ────────────────────────────────────────────────────
    print(f"\n{'─' * 60}")
    print("Integration Notes:")
    print(f"  Issuer DID: {wallet.issuer_did}")
    print(f"  VCT: http://localhost:7002/identity_credential")
    print(f"  Holder key type: EC P-256 (secp256r1)")
    print(f"  Credential format: vc+sd-jwt")
    print(f"{'─' * 60}")

    if VERBOSE:
        print("\nMock Wallet Details:")
        print(f"  Issuer key JWK: {json.dumps(to_jwk(wallet.issuer_key.public_key()))}")
        print(f"  Holder key JWK: {json.dumps(to_jwk(wallet.holder_key.public_key()))}")
        print(f"  SD-JWT VC token ({len(wallet.sd_jwt_vc)} chars)")
        print(f"  Disclosures: {len(wallet.disclosures)}")
        for disc in wallet.disclosures:
            print(f"    {disc}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Make executable**

```bash
chmod +x integration/examples/python/verify_sd_jwt.py
```

- [ ] **Step 3: Commit**

```bash
git add integration/examples/python/verify_sd_jwt.py
git commit -m "feat: add Python SD-JWT verification example with mock wallet

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Create API reference documentation

**Files:**
- Create: `integration/api-reference.md`

- [ ] **Step 1: Write api-reference.md**

```markdown
# Verifier API Reference

**Base URL:** `http://localhost:7003`

The verifier-api implements the OID4VP (OpenID for Verifiable Presentations) specification.
It creates authorization requests, publishes Presentation Definitions, accepts VP tokens
via direct_post, and evaluates verification policies.

All endpoints are public — no authentication required.

---

## Endpoints

### `POST /openid4vc/verify`

Create an OID4VP authorization request.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | yes | `application/json` |
| `authorizeBaseUrl` | yes | Base URI for the authorization request. Typically `openid4vp://authorize`. |
| `responseMode` | yes | How the wallet returns the VP token. Use `direct_post` for server-to-server flows. |

**Request Body:**

```json
{
  "request_credentials": [
    {
      "format": "vc+sd-jwt",
      "input_descriptor": {
        "id": "unique-request-id",
        "format": { "vc+sd-jwt": {} },
        "constraints": {
          "fields": [
            {
              "path": ["$.claim_name"],
              "filter": { "type": "string", "pattern": ".*" }
            }
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

| Field | Type | Description |
|-------|------|-------------|
| `request_credentials` | array | One or more credential request objects, each with `format` and `input_descriptor`. |
| `request_credentials[].format` | string | Credential format. Use `"vc+sd-jwt"` for SD-JWT VCs, `"jwt_vc_json"` for W3C JWT VCs, `"mso_mdoc"` for ISO 18013-5 mDL. |
| `request_credentials[].input_descriptor` | object | PE 2.0 Input Descriptor specifying which claims are requested. |
| `input_descriptor.id` | string | Unique identifier for this input descriptor. |
| `input_descriptor.constraints.fields` | array | Array of field constraints using JSONPath selectors. |
| `input_descriptor.constraints.fields[].path` | array | JSONPath expressions pointing to claims in the credential (e.g. `["$.birthdate"]`). |
| `input_descriptor.constraints.fields[].filter` | object | Optional filter. `{"type": "string", "pattern": ".*"}` matches any string value. |
| `input_descriptor.constraints.limit_disclosure` | string | `"required"` tells the wallet to only disclose requested fields (privacy-preserving). |
| `vp_policies` | array | Policies evaluated against the Verifiable Presentation. |
| `vc_policies` | array | Policies evaluated against each Verifiable Credential. |

**Response:**

An `openid4vp://` URI with query parameters:

```
openid4vp://authorize?response_type=vp_token
  &client_id=http%3A%2F%2Flocalhost%3A7003%2Fopenid4vc%2Fverify
  &response_uri=http%3A%2F%2Flocalhost%3A7003%2Fopenid4vc%2Fverify%2Fresponse
  &presentation_definition_uri=http%3A%2F%2Flocalhost%3A7003%2Fopenid4vc%2Fpd%2F<pd-id>
  &state=<session-state>
  &nonce=<nonce>
  &response_mode=direct_post
```

| Parameter | Description |
|-----------|-------------|
| `state` | Session identifier. Use this to poll for the verification result. |
| `nonce` | Replay protection nonce. Must be included in the KB-JWT. |
| `presentation_definition_uri` | URI to fetch the Presentation Definition. |
| `response_uri` | URI where the wallet POSTs the VP token. |
| `client_id` | The verifier's identifier. Used as `aud` in the KB-JWT. |

---

### `GET /openid4vc/pd/{id}`

Fetch a Presentation Definition.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| `id` | The presentation definition ID from the auth request URI (path segment after `/openid4vc/pd/`). |

**Response:**

```json
{
  "id": "abc123",
  "input_descriptors": [
    {
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
  ]
}
```

This is a Presentation Exchange 2.0 Presentation Definition. Your wallet must:
1. Match stored credentials against each `input_descriptor`
2. Select the disclosures for requested fields
3. Assemble a VP token with only the required claims

---

### `POST /openid4vc/verify/response`

Submit a VP token to the verifier (the `direct_post` response endpoint).

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | yes | `application/json` |

**Request Body:**

```json
{
  "vp_token": "<sd-jwt-vc>~<disclosure1>~<disclosure2>~<kb-jwt>~",
  "state": "<session-state>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `vp_token` | string | The SD-JWT VP token. For SD-JWT VCs: `<JWT>~<disclosures>~...~<KB-JWT>~` |
| `state` | string | The state parameter from the auth request URI. |

**Response:**

- `200 OK` with optional `{"redirect_uri": "..."}` or empty body.

The verifier associates the VP token with the session and evaluates the configured policies.
No result is returned from this endpoint — poll `GET /openid4vc/session/{state}` for the result.

---

### `GET /openid4vc/session/{state}`

Retrieve the verification session result.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| `state` | The session state token from the auth request URI. |

**Response:**

```json
{
  "id": "<state>",
  "verificationResult": "true",
  "policyResults": {
    "signature_sd-jwt-vc": true,
    "not-before": true,
    "expired": true
  },
  "presentationSubmission": { },
  "vp_token": "<the submitted vp_token>",
  "state": "<state>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `verificationResult` | string | `"true"` if all policies passed. |
| `policyResults` | object | Per-policy results. `true` = passed, `false` = failed. |

**Typical HTTP status codes:**

| Status | Meaning |
|--------|---------|
| `200` | Session found, result available. |
| `404` | Session not found (expired or wrong state). |

---

## Policy Reference

### VP Policies

Evaluated against the Verifiable Presentation as a whole.

| Policy | Description |
|--------|-------------|
| `signature_sd-jwt-vc` | Validates the issuer's ES256 signature on the SD-JWT VC, the SD hash binding (hashes of disclosure arrays match `_sd` in the JWT), and the holder's KB-JWT signature against `cnf.jwk`. |
| `signature_jwt-vc` | Validates the issuer's signature on a JWT VC (plain W3C VC, no selective disclosure). |
| `presentation-definition` | Validates that the Presentation Submission matches the Presentation Definition's input descriptors. |

### VC Policies

Evaluated against each Verifiable Credential individually.

| Policy | Description |
|--------|-------------|
| `not-before` | Asserts `nbf` (not-before) timestamp is in the past. |
| `expired` | Asserts `exp` (expiration) timestamp is in the future. |
| `schema` | Validates the credential against a JSON Schema. Requires a `schema_uri` or inline `schema` in the credential's input descriptor. |

---

## Complete Flow Summary

```
┌──────────┐     ┌───────────────┐     ┌──────────┐
│  Your    │     │  Verifier     │     │  Your    │
│  App     │     │  API          │     │  Wallet  │
└────┬─────┘     └──────┬────────┘     └────┬─────┘
     │                  │                   │
     │ POST /verify     │                   │
     │─────────────────>│                   │
     │                  │                   │
     │ openid4vp:// URI │                   │
     │<─────────────────│                   │
     │                  │                   │
     │ Parse URI, extract state + PD URI    │
     │─────────────────────────────────────>│
     │                  │                   │
     │                  │  GET /pd/{id}     │
     │                  │<──────────────────│
     │                  │                   │
     │                  │  Presentation Def │
     │                  │──────────────────>│
     │                  │                   │
     │                  │  Match creds,     │
     │                  │  create VP token  │
     │                  │                   │
     │                  │  POST /verify/response
     │                  │<──────────────────│
     │                  │                   │
     │ GET /session/{state}                 │
     │─────────────────>│                   │
     │                  │                   │
     │ verificationResult: true             │
     │<─────────────────│                   │
     │                  │                   │
```

---

## Error Handling

The verifier returns standard HTTP error codes:

| Status | Typical Cause |
|--------|---------------|
| `400` | Malformed request body or missing required headers (`authorizeBaseUrl`, `responseMode`). |
| `404` | Session not found or expired. Sessions are in-memory; they are lost on container restart. |
| `500` | Internal policy evaluation error (e.g., invalid VP token structure). |

Error responses include a plain-text or JSON body with details where available.
```

- [ ] **Step 2: Commit**

```bash
git add integration/api-reference.md
git commit -m "docs: add verifier API reference with endpoint schemas and flow

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Create README

**Files:**
- Create: `integration/README.md`

- [ ] **Step 1: Write README.md**

```markdown
# Verifier API Integration Package

This package helps you integrate the walt.id **verifier-api** into your own
wallet/issuer ecosystem. It provides a standalone Docker deployment, a complete
API reference, and runnable example scripts that demonstrate SD-JWT VC
verification end-to-end.

## What's Included

| File | Purpose |
|------|---------|
| `docker-compose.yaml` | Standalone verifier-api deployment (single container, no dependencies) |
| `config/` | Verifier configuration files |
| `api-reference.md` | Complete API reference with request/response schemas |
| `examples/bash/verify-sd-jwt.sh` | Bash script: full OID4VP verification flow with mock wallet |
| `examples/bash/common.sh` | Shared bash utilities (sourced by verify-sd-jwt.sh) |
| `examples/python/verify_sd_jwt.py` | Python script: full OID4VP verification flow with mock wallet |
| `examples/python/verifier_client.py` | Reusable Python client library for the verifier API |
| `scripts/start-verifier.sh` | One-command startup with health check |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [jq](https://jqlang.github.io/jq/) — JSON processor (for bash examples)
- [curl](https://curl.se/) — HTTP client (for bash examples)
- Python 3.9+ with `cryptography` (for Python examples and bash crypto)

```bash
pip install cryptography
```

## Quick Start

```bash
# 1. Start the verifier
bash scripts/start-verifier.sh

# 2. Run an example (bash or Python — both do the same thing)
bash examples/bash/verify-sd-jwt.sh
# or
python3 examples/python/verify_sd_jwt.py
```

If everything works, you'll see `Verification SUCCESS` at the end.

## How It Works

The example scripts simulate a complete OID4VP verification flow:

1. **Your app** creates a verification request via `POST /openid4vc/verify`
2. The verifier returns an `openid4vp://` URI with session state
3. **Your wallet** (mock wallet in the examples) parses the URI, fetches the
   Presentation Definition, matches credentials, creates a VP token with
   selective disclosures, and posts it to the verifier's `response_uri`
4. **Your app** polls `GET /openid4vc/session/{state}` for the result

The mock wallet generates a valid SD-JWT VC on the fly, so no external
wallet or issuer is needed.

## Integrating Into Your Own Ecosystem

### You Have

- A wallet that holds SD-JWT VCs issued by your issuer
- An issuer that creates SD-JWT VCs with selective disclosure
- The need to verify those credentials

### What You Add

The verifier-api as a standalone service. It is stateless — no database,
no persistence. Just the Docker container.

### Integration Steps

**1. Point the verifier at your wallet/issuer:**
Edit `config/verifier-service.conf` — set `baseUrl` to the verifier's
externally reachable URL if your wallet runs inside Docker.

**2. Create verification requests using the API:**
Use `POST /openid4vc/verify` as shown in the examples. Customize the
`request_credentials`, `vp_policies`, and `vc_policies` to match your
credential types and requirements.

**3. In your wallet, handle the OID4VP flow:**
Replace the `MockWallet` class (Python) or the mock wallet section (bash)
with calls to your actual wallet. Your wallet must:
- Parse the `openid4vp://` URI
- Fetch the Presentation Definition
- Match credentials against the input descriptors
- Create the VP token with selective disclosures
- Post the VP token to the `response_uri`

**4. Poll for results:**
After submitting the VP token, call `GET /openid4vc/session/{state}` to
retrieve the verification result.

### Key Integration Points in the Code

**Python (`verifier_client.py`):**
```python
from verifier_client import VerifierClient

client = VerifierClient("http://localhost:7003")

# Create request
auth = client.create_verification_request(
    credentials=[...],
    vp_policies=["signature_sd-jwt-vc"],
    vc_policies=["not-before", "expired"]
)

# Your wallet processes auth.state, auth.nonce, auth.presentation_definition_uri
# Your wallet posts VP token to auth.response_uri

# Check result
result = client.get_session(auth.state)
print(result.verification_result)  # True or False
```

**Bash (`common.sh`):**
```bash
source examples/bash/common.sh

# Create request
AUTH_REQUEST=$(curl -s -X POST "$VERIFIER_API/openid4vc/verify" ...)
parse_auth_uri "$AUTH_REQUEST"

# $AUTH_STATE, $AUTH_NONCE, $AUTH_PD_URI, $AUTH_RESPONSE_URI are now set
# Your wallet processes these values

# Check result
VERIFICATION=$(curl -s "$VERIFIER_API/openid4vc/session/$AUTH_STATE")
```

## Configuration

The verifier has minimal configuration. All files live in `config/`:

| File | Purpose |
|------|---------|
| `verifier-service.conf` | Sets `baseUrl` — the externally reachable URL of the verifier |
| `web.conf` | Sets `webHost` and `webPort` — always `0.0.0.0:7003` |
| `_features.conf` | Enables `dev-mode` for DID:JWK resolution without HTTPS |
| `dev-mode.conf` | Disables HTTPS requirement for DID:web resolution |

## Stopping the Verifier

```bash
docker compose down
```

## Troubleshooting

**Port 7003 already in use:**
```bash
# Find what's using the port
lsof -i :7003
# Edit docker-compose.yaml and config/web.conf to use a different port
```

**Verification fails:**
- Check the verifier logs: `docker compose logs verifier-api`
- Ensure your SD-JWT VC uses ES256 (P-256) — other algorithms are not supported by default
- The `vct` (Verifiable Credential Type) must match the issuer's metadata

**"Module not found: cryptography":**
```bash
pip install cryptography
```

**Docker image not found:**
```bash
docker pull waltid/verifier-api:stable
```
```

- [ ] **Step 2: Commit**

```bash
git add integration/README.md
git commit -m "docs: add verifier integration package README

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: End-to-end verification test

**Files:** None (test only)

- [ ] **Step 1: Start the verifier**

```bash
bash integration/scripts/start-verifier.sh
```

Expected: Verifier starts and health check passes within 30 seconds.

- [ ] **Step 2: Run the bash example**

```bash
bash integration/examples/bash/verify-sd-jwt.sh --verbose
```

Expected: All phases complete, `Verification SUCCESS`.

- [ ] **Step 3: Run the Python example**

```bash
python3 integration/examples/python/verify_sd_jwt.py --verbose
```

Expected: All phases complete, `Verification SUCCESS`.

- [ ] **Step 4: Stop the verifier**

```bash
cd integration && docker compose down
```

- [ ] **Step 5: Final commit if any fixes were made**

```bash
git add -A
git commit -m "feat: complete verifier-api integration package

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
