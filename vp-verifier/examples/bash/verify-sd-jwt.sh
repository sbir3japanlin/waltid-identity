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

PD_ID=$(echo "$PRESENTATION_DEF" | jq -r '.id')
INPUT_DESCRIPTOR_ID=$(echo "$PRESENTATION_DEF" | jq -r '.input_descriptors[0].id')

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

PRESENTATION_SUBMISSION=$(jq -n \
  --arg pd_id "$PD_ID" \
  --arg desc_id "$INPUT_DESCRIPTOR_ID" \
  '{
    id: ("ps-" + (now | tostring | gsub("\\.";""))),
    definition_id: $pd_id,
    descriptor_map: [{
      id: $desc_id,
      format: "vc+sd-jwt",
      path: "$"
    }]
  }')
vlog "Presentation Submission" "" "" "$PRESENTATION_SUBMISSION"

VP_RESPONSE=$(curl -s -X POST "$RESPONSE_URI" \
  --data-urlencode "vp_token=$VP_TOKEN" \
  --data-urlencode "presentation_submission=$PRESENTATION_SUBMISSION" \
  --data-urlencode "state=$AUTH_STATE")
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
