#!/bin/bash
# Walt.id Identity Stack - SD-JWT VC end-to-end test
# Issues an identity credential as vc+sd-jwt (IETF SD-JWT VC) and verifies it
# using OID4VCI (PRE_AUTHORIZED) and OID4VP (Presentation Exchange).
#
# Usage: ./test-sd-jwt.sh [email] [password]


# docker compose down -v
# rm -rf ./wallet-api/data/*

set -euo pipefail

WALLET_API="http://localhost:7001/wallet-api"
ISSUER_API="http://localhost:7002"
VERIFIER_API="http://localhost:7003"

# ── Verbose mode & argument parsing ──────────────────────────────────────────
VERBOSE=false
_PARGS=()
for _arg in "$@"; do
  case "$_arg" in
    --verbose|-v) VERBOSE=true ;;
    *) _PARGS+=("$_arg") ;;
  esac
done
EMAIL="${_PARGS[0]:-test@email.com}"
PASSWORD="${_PARGS[1]:-test}"
_VLOG_TMP=$(mktemp)

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
# Disable colors when stdout is not a terminal (e.g. redirected to a file)
[ -t 1 ] || { RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; NC=''; }

step() { echo -e "\n${BOLD}${CYAN}=== Step $1: $2 ===${NC}"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
# In --verbose / -v mode: print full req/res for every step and write a JSON log.
vlog_step() {
  $VERBOSE || return 0
  local _s="$1" _t="$2" _m="$3" _u="$4" _req="${5:-}" _res="${6:-}"
  echo -e "\n${YELLOW}  ┌── Step $_s ─── $_m $_u${NC}"
  if [[ -n "$_req" ]]; then
    echo -e "${YELLOW}  │  REQUEST:${NC}"
    ( echo "$_req" | jq . 2>/dev/null || echo "$_req" ) | head -50 | sed 's/^/  │   /'
  fi
  echo -e "${YELLOW}  │  RESPONSE:${NC}"
  ( echo "$_res" | jq . 2>/dev/null || echo "$_res" ) | head -60 | sed 's/^/  │   /'
  echo -e "${YELLOW}  └──${NC}"
  jq -cn --arg s "$_s" --arg t "$_t" --arg m "$_m" --arg u "$_u" \
         --arg req "$_req" --arg res "$_res" \
    '{step:$s,title:$t,method:$m,url:$u,request:$req,response:$res}' >> "$_VLOG_TMP"
}

# ── Dependency check ──────────────────────────────────────────────────────────
command -v jq   >/dev/null 2>&1 || fail "jq is required. Install with: brew install jq"
command -v curl >/dev/null 2>&1 || fail "curl is required."

# ── Step 0: Register account ──────────────────────────────────────────────────
step "0" "Register account ($EMAIL)"
_REG_REQ="{\"type\":\"email\",\"name\":\"Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
_REG_RESP=$(curl -s -w '\nHTTP_STATUS:%{http_code}' \
  -X POST "$WALLET_API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "$_REG_REQ")
HTTP_CODE=$(echo "$_REG_RESP" | grep 'HTTP_STATUS:' | sed 's/HTTP_STATUS://')
_REG_BODY=$(echo "$_REG_RESP" | grep -v 'HTTP_STATUS:')
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  ok "Account registered"
else
  info "Registration returned HTTP $HTTP_CODE — account may already exist, continuing..."
fi
vlog_step "0" "Register Account" "POST" "$WALLET_API/auth/register" \
  "$_REG_REQ" "HTTP $HTTP_CODE"

# ── Step 1: Login ─────────────────────────────────────────────────────────────
step "1" "Login"
LOGIN=$(curl -s -X POST "$WALLET_API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"email\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | jq -r '.token // empty')
[[ -n "$TOKEN" ]] || fail "Login failed: $LOGIN"
ok "Token: ${TOKEN:0:50}..."
vlog_step "1" "Login" "POST" "$WALLET_API/auth/login" \
  "{\"type\":\"email\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" "$LOGIN"

# ── Step 2: Retrieve Wallet ID ────────────────────────────────────────────────
step "2" "Retrieve Wallet ID"
WALLETS=$(curl -s "$WALLET_API/wallet/accounts/wallets" \
  -H "authorization: Bearer $TOKEN")
WALLET_ID=$(echo "$WALLETS" | jq -r '.wallets[0].id // empty')
[[ -n "$WALLET_ID" ]] || fail "No wallet found: $WALLETS"
ok "Wallet ID: $WALLET_ID"
vlog_step "2" "Get Wallet ID" "GET" "$WALLET_API/wallet/accounts/wallets" "" "$WALLETS"

# ── Step 3: Retrieve Key ──────────────────────────────────────────────────────
step "3" "Retrieve Key"
KEYS=$(curl -s "$WALLET_API/wallet/$WALLET_ID/keys" \
  -H "authorization: Bearer $TOKEN")
echo "$KEYS" | jq .
KEY_ID=$(echo "$KEYS" | jq -r '.[0].keyId.id // empty')
ok "Key ID: $KEY_ID"
vlog_step "3" "List Keys" "GET" "$WALLET_API/wallet/$WALLET_ID/keys" "" "$KEYS"

# ── Step 4: Retrieve DID ──────────────────────────────────────────────────────
step "4" "Retrieve DID"
DIDS=$(curl -s "$WALLET_API/wallet/$WALLET_ID/dids" \
  -H "authorization: Bearer $TOKEN")
echo "$DIDS" | jq '[.[] | {did, alias, default}]'
DID=$(echo "$DIDS" | jq -r '.[0].did // empty')
[[ -n "$DID" ]] || fail "No DID found: $DIDS"
ok "DID: $DID"
vlog_step "4" "Retrieve DID" "GET" "$WALLET_API/wallet/$WALLET_ID/dids" "" "$DIDS"

# ── Step 5: Retrieve Issuer well-known config ─────────────────────────────────
step "5" "Retrieve Issuer well-known config"
_WELLKNOWN=$(curl -s "$ISSUER_API/draft13/.well-known/openid-configuration")
echo "$_WELLKNOWN" | jq .
vlog_step "5" "Issuer Well-Known Config" "GET" \
  "$ISSUER_API/draft13/.well-known/openid-configuration" "" "$_WELLKNOWN"

# ── Step 6: Onboard Issuer ───────────────────────────────────────────────────
step "6" "Onboard Issuer"
ISSUER=$(curl -s -X POST "$ISSUER_API/onboard/issuer" \
  -H 'Content-Type: application/json' \
  -d '{"key":{"keyType":"secp256r1"}}')
ISSUER_KEY=$(echo "$ISSUER" | jq -c '.issuerKey // empty')
ISSUER_DID=$(echo "$ISSUER" | jq -r '.issuerDid // empty')
[[ -n "$ISSUER_DID" ]] || fail "Onboard issuer failed: $ISSUER"
ok "Issuer DID: $ISSUER_DID"
vlog_step "6" "Onboard Issuer" "POST" "$ISSUER_API/onboard/issuer" \
  '{"key":{"keyType":"secp256r1"}}' "$ISSUER"

# ── Step 7: Create SD-JWT VC Credential Offer ────────────────────────────────
# credentialConfigurationId "identity_credential_vc+sd-jwt" maps to format
# "vc+sd-jwt" with vct = "http://host.docker.internal:7002/identity_credential"
# (from docker-compose/issuer-api/config/credential-issuer-metadata.conf).
#
# selectiveDisclosure controls per-field SD: birthdate and family_name are
# individually disclosable; given_name is always revealed.
step "7" "Create SD-JWT VC Credential Offer"
ISSUE_PAYLOAD=$(jq -n \
  --argjson issuerKey "$ISSUER_KEY" \
  --arg issuerDid "$ISSUER_DID" \
  '{
    issuerKey: $issuerKey,
    issuerDid: $issuerDid,
    credentialConfigurationId: "identity_credential_vc+sd-jwt",
    credentialData: {
      given_name: "John",
      family_name: "Doe",
      email: "johndoe@example.com",
      phone_number: "+1-202-555-0101",
      address: {
        street_address: "123 Main St",
        locality: "Anytown",
        region: "Anystate",
        country: "US"
      },
      birthdate: "1940-01-01",
      is_over_18: true,
      is_over_21: true,
      is_over_65: true
    },
    mapping: {
      id: "<uuid>",
      iat: "<timestamp-seconds>",
      nbf: "<timestamp-seconds>",
      exp: "<timestamp-in-seconds:365d>"
    },
    selectiveDisclosure: {
      fields: {
        birthdate:   {sd: true},
        family_name: {sd: true},
        given_name:  {sd: false}
      }
    },
    authenticationMethod: "PRE_AUTHORIZED"
  }')

OFFER_URI=$(curl -s -X POST "$ISSUER_API/openid4vc/sdjwt/issue" \
  -H 'Content-Type: application/json' \
  -d "$ISSUE_PAYLOAD")
ok "Raw offer URI: $OFFER_URI"
vlog_step "7" "Create SD-JWT VC Credential Offer" "POST" "$ISSUER_API/openid4vc/sdjwt/issue" \
  "$ISSUE_PAYLOAD" "$OFFER_URI"

# wallet-api runs inside Docker; rewrite localhost → host.docker.internal
OFFER_URI_FIXED=$(echo "$OFFER_URI" | sed 's/localhost/host.docker.internal/g')
info "Fixed offer URI: $OFFER_URI_FIXED"

# ── Step 8/9: Inspect offer content ─────────────────────────────────────────
step "8/9" "Inspect offer content"
OFFER_ID=$(echo "$OFFER_URI" | grep -oE 'id=[^&]+' | cut -d= -f2 || true)
if [[ -n "$OFFER_ID" ]]; then
  info "Offer ID: $OFFER_ID"
  _OFFER_CONTENT=$(curl -s "$ISSUER_API/draft13/credentialOffer?id=$OFFER_ID")
  echo "$_OFFER_CONTENT" | jq .
  vlog_step "8/9" "Inspect Offer Content" "GET" \
    "$ISSUER_API/draft13/credentialOffer?id=$OFFER_ID" "" "$_OFFER_CONTENT"
else
  info "Could not extract offer ID from URI, skipping content check"
fi

# ── Step 10: Claim SD-JWT VC into wallet ─────────────────────────────────────
step "10" "Claim SD-JWT VC (useOfferRequest)"
CREDENTIAL_RESPONSE=$(curl -s -X POST \
  "$WALLET_API/wallet/$WALLET_ID/exchange/useOfferRequest" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d "$OFFER_URI_FIXED")
echo "$CREDENTIAL_RESPONSE" | jq . 2>/dev/null || echo "$CREDENTIAL_RESPONSE"
CLAIMED_CRED_ID=$(echo "$CREDENTIAL_RESPONSE" | jq -r '.[0].id // empty')
[[ -n "$CLAIMED_CRED_ID" ]] || fail "No credential returned from useOfferRequest: $CREDENTIAL_RESPONSE"
ok "Claimed credential ID: $CLAIMED_CRED_ID"
vlog_step "10" "Claim SD-JWT VC" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/useOfferRequest" \
  "$OFFER_URI_FIXED" "$CREDENTIAL_RESPONSE"

# ── Step 11: Create OID4VP Authorization Request ─────────────────────────────
# Request birthdate from the SD-JWT VC (it was marked sd:true, so the wallet
# will create a selective disclosure for it).  family_name is also selective;
# given_name is always present.
step "11" "Create Authorization Request (Verifier)"
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
ok "Auth request: ${AUTH_REQUEST:0:80}..."

STATE=$(echo "$AUTH_REQUEST" | grep -oE 'state=[^&]+' | head -1 | cut -d= -f2)
[[ -n "$STATE" ]] || fail "Could not extract state from auth request: $AUTH_REQUEST"
info "State: $STATE"
vlog_step "11" "Create OID4VP Auth Request" "POST" "$VERIFIER_API/openid4vc/verify" \
  '{"request_credentials":[{"format":"vc+sd-jwt"}],"vp_policies":["signature_sd-jwt-vc"]}' \
  "$AUTH_REQUEST"

# ── Step 12: Match Credentials for Presentation Definition ───────────────────
step "12" "Match Credentials for Presentation Definition"
PD_URI_ENC=$(echo "$AUTH_REQUEST" | grep -oE 'presentation_definition_uri=[^&]+' | cut -d= -f2-)
PD_URI=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$PD_URI_ENC")
PD_URI_LOCAL=$(echo "$PD_URI" | sed 's/host\.docker\.internal/localhost/g')
info "Presentation definition URI: $PD_URI_LOCAL"

PRESENTATION_DEF=$(curl -s "$PD_URI_LOCAL")
echo "$PRESENTATION_DEF" | jq .

CRED_ID=""
if [[ -n "$PRESENTATION_DEF" && "$PRESENTATION_DEF" != "{}" ]]; then
  MATCHING_CREDS=$(curl -s -X POST \
    "$WALLET_API/wallet/$WALLET_ID/exchange/matchCredentialsForPresentationDefinition" \
    -H 'accept: application/json' \
    -H 'Content-Type: application/json' \
    -H "authorization: Bearer $TOKEN" \
    -d "$PRESENTATION_DEF")
  echo "$MATCHING_CREDS" | jq .
  CRED_ID=$(echo "$MATCHING_CREDS" | jq -r '.[0].id // empty' 2>/dev/null || true)
fi
if [[ -z "$CRED_ID" ]]; then
  info "Credential matching returned empty; using claimed credential ID"
  CRED_ID="$CLAIMED_CRED_ID"
fi
ok "Using credential ID: $CRED_ID"
vlog_step "12a" "Fetch Presentation Definition" "GET" "$PD_URI_LOCAL" "" "$PRESENTATION_DEF"
vlog_step "12b" "Match Credentials for PD" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/matchCredentialsForPresentationDefinition" \
  "$PRESENTATION_DEF" "${MATCHING_CREDS:-}"

# ── Step 13: Resolve Presentation Request ────────────────────────────────────
step "13" "Resolve Presentation Request"
AUTH_REQUEST_FIXED=$(echo "$AUTH_REQUEST" | sed 's/localhost/host.docker.internal/g')

RESOLVED_REQUEST=$(curl -s -X POST \
  "$WALLET_API/wallet/$WALLET_ID/exchange/resolvePresentationRequest" \
  -H 'accept: text/plain' \
  -H 'Content-Type: text/plain' \
  -H "authorization: Bearer $TOKEN" \
  --data-raw "$AUTH_REQUEST_FIXED")
info "Resolved: ${RESOLVED_REQUEST:0:80}..."
vlog_step "13" "Resolve Presentation Request" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/resolvePresentationRequest" \
  "$AUTH_REQUEST_FIXED" "$RESOLVED_REQUEST"

# ── Step 14: Fulfill Presentation Request ────────────────────────────────────
step "14" "Fulfill Presentation Request (usePresentationRequest)"
PRESENT_PAYLOAD=$(jq -n \
  --arg pr "$RESOLVED_REQUEST" \
  --arg cid "$CRED_ID" \
  '{"presentationRequest": $pr, "selectedCredentials": [$cid]}')

PRESENT_RESPONSE=$(curl -s -X POST \
  "$WALLET_API/wallet/$WALLET_ID/exchange/usePresentationRequest" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d "$PRESENT_PAYLOAD")
echo "$PRESENT_RESPONSE" | jq . 2>/dev/null || echo "$PRESENT_RESPONSE"
vlog_step "14" "Fulfill Presentation Request" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/usePresentationRequest" \
  "$PRESENT_PAYLOAD" "$PRESENT_RESPONSE"

# ── Step 15: Verify SD-JWT VC Presentation ───────────────────────────────────
step "15" "Verify SD-JWT VC Presentation"
VERIFICATION=$(curl -s -X GET "$VERIFIER_API/openid4vc/session/$STATE" \
  -H 'accept: */*')
echo "$VERIFICATION" | jq .
VERIFY_RESULT=$(echo "$VERIFICATION" | jq -r '.verificationResult // empty')
vlog_step "15" "Check Verification Result" "GET" "$VERIFIER_API/openid4vc/session/$STATE" \
  "" "$VERIFICATION"
[[ "$VERIFY_RESULT" == "true" ]] && ok "Verification SUCCESS" || fail "Verification failed: $VERIFY_RESULT"

# ── Done ─────────────────────────────────────────────────────────────────────
if $VERBOSE; then
  _VLOG_DIR="$(dirname "${BASH_SOURCE[0]}")/demo"
  mkdir -p "$_VLOG_DIR"
  _VLOG_OUT="$_VLOG_DIR/sdjwt-steps.json"
  jq -s '.' "$_VLOG_TMP" > "$_VLOG_OUT"
  ok "Verbose step data written to: $_VLOG_OUT"
fi
rm -f "$_VLOG_TMP"
echo -e "\n${BOLD}${GREEN}All steps completed.${NC}"
