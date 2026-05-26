#!/bin/bash
# Walt.id Identity Stack - ISO/IEC 18013-5 mDoc (mDL) end-to-end test
# Usage: ./test-mdoc-flow.sh [email] [password]


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
command -v jq  >/dev/null 2>&1 || fail "jq is required. Install with: brew install jq"
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

# ── Step 3: Create IACA Certificate ──────────────────────────────────────────
step "3" "Create IACA (Issuing Authority Certification Authority) certificate"
IACA=$(curl -s -X POST "$ISSUER_API/onboard/iso-mdl/iacas" \
  -H 'Content-Type: application/json' \
  -d '{
    "certificateData": {
      "country": "US",
      "commonName": "Test IACA",
      "issuerAlternativeNameConf": {
        "uri": "https://iaca.example.com"
      }
    }
  }')
echo "$IACA" | jq '{commonName: .certificateData.commonName, notBefore: .certificateData.notBefore, notAfter: .certificateData.notAfter}'
IACA_KEY=$(echo "$IACA" | jq -c '.iacaKey // empty')
IACA_CERT_DATA=$(echo "$IACA" | jq -c '.certificateData // empty')
IACA_CERT_PEM=$(echo "$IACA" | jq -r '.certificatePEM // empty' | tr -d '\r')
[[ -n "$IACA_KEY" && "$IACA_KEY" != "null" ]] || fail "IACA onboarding failed: $IACA"
ok "IACA certificate created"
vlog_step "3" "Create IACA Certificate" "POST" "$ISSUER_API/onboard/iso-mdl/iacas" \
  '{"certificateData":{"country":"US","commonName":"Test IACA"}}' "$IACA"

# ── Step 4: Create Document Signer Certificate ────────────────────────────────
step "4" "Create Document Signer (DS) certificate"
DS_PAYLOAD=$(jq -n \
  --argjson iacaKey "$IACA_KEY" \
  --argjson iacaCertData "$IACA_CERT_DATA" \
  '{
    iacaSigner: {
      iacaKey: $iacaKey,
      certificateData: $iacaCertData
    },
    certificateData: {
      country: "US",
      commonName: "Test DS",
      crlDistributionPointUri: "https://iaca.example.com/crl"
    }
  }')
DS=$(curl -s -X POST "$ISSUER_API/onboard/iso-mdl/document-signers" \
  -H 'Content-Type: application/json' \
  -d "$DS_PAYLOAD")
echo "$DS" | jq '{commonName: .certificateData.commonName, notBefore: .certificateData.notBefore, notAfter: .certificateData.notAfter}' 2>/dev/null || echo "$DS"
DS_KEY=$(echo "$DS" | jq -c '.documentSignerKey // empty')
DS_CERT_PEM=$(echo "$DS" | jq -r '.certificatePEM // empty' | tr -d '\r')
[[ -n "$DS_KEY" && "$DS_KEY" != "null" ]] || fail "Document signer onboarding failed: $DS"
ok "Document signer certificate created"
vlog_step "4" "Create Document Signer Certificate" "POST" "$ISSUER_API/onboard/iso-mdl/document-signers" \
  "$DS_PAYLOAD" "$DS"

# ── Step 5: Retrieve Issuer well-known config ─────────────────────────────────
step "5" "Retrieve Issuer well-known config"
_WELLKNOWN=$(curl -s "$ISSUER_API/draft13/.well-known/openid-configuration")
echo "$_WELLKNOWN" | jq .
vlog_step "5" "Issuer Well-Known Config" "GET" \
  "$ISSUER_API/draft13/.well-known/openid-configuration" "" "$_WELLKNOWN"

# ── Step 6: Create mDL Credential Offer ──────────────────────────────────────
step "6" "Create mDL Credential Offer"
ISSUE_PAYLOAD=$(jq -n \
  --argjson issuerKey "$DS_KEY" \
  --arg dsCertPem "$DS_CERT_PEM" \
  --arg iacaCertPem "$IACA_CERT_PEM" \
  '{
    issuerKey: $issuerKey,
    credentialConfigurationId: "org.iso.18013.5.1.mDL",
    mdocData: {
      "org.iso.18013.5.1": {
        family_name: "Doe",
        given_name: "John",
        birth_date: "1986-03-22",
        issue_date: "2019-10-20",
        expiry_date: "2030-10-20",
        issuing_country: "US",
        issuing_authority: "US DMV",
        document_number: "123456789",
        portrait: [141, 182, 121, 111, 238, 50, 120, 94, 54, 111, 113, 13, 241, 12, 12],
        driving_privileges: [
          {
            vehicle_category_code: "B",
            issue_date: "2019-10-20",
            expiry_date: "2030-10-20"
          }
        ],
        un_distinguishing_sign: "USA"
      }
    },
    x5Chain: [$dsCertPem],
    authenticationMethod: "PRE_AUTHORIZED"
  }')

OFFER_URI=$(curl -s -X POST "$ISSUER_API/openid4vc/mdoc/issue" \
  -H 'Content-Type: application/json' \
  -d "$ISSUE_PAYLOAD")
ok "Raw offer URI: ${OFFER_URI:0:80}..."
vlog_step "6" "Create mDL Credential Offer" "POST" "$ISSUER_API/openid4vc/mdoc/issue" \
  "$ISSUE_PAYLOAD" "$OFFER_URI"

# wallet-api runs inside Docker and cannot reach the host via "localhost";
# replace with host.docker.internal so Docker can resolve it to the host machine.
OFFER_URI_FIXED=$(echo "$OFFER_URI" | sed 's/localhost/host.docker.internal/g')
info "Fixed offer URI: ${OFFER_URI_FIXED:0:80}..."

# ── Step 7: Inspect offer content ────────────────────────────────────────────
step "7" "Inspect offer content"
OFFER_ID=$(echo "$OFFER_URI" | grep -oE 'id=[^&]+' | cut -d= -f2 || true)
if [[ -n "$OFFER_ID" ]]; then
  info "Offer ID: $OFFER_ID"
  _OFFER_CONTENT=$(curl -s "$ISSUER_API/draft13/credentialOffer?id=$OFFER_ID")
  echo "$_OFFER_CONTENT" | jq .
  vlog_step "7" "Inspect Offer Content" "GET" \
    "$ISSUER_API/draft13/credentialOffer?id=$OFFER_ID" "" "$_OFFER_CONTENT"
else
  info "Could not extract offer ID from URI, skipping content check"
fi

# ── Step 8: Claim mDL credential into wallet ─────────────────────────────────
step "8" "Claim mDL credential (useOfferRequest)"
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
vlog_step "8" "Claim mDL Credential" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/useOfferRequest" \
  "$OFFER_URI_FIXED" "$CREDENTIAL_RESPONSE"

# ── Step 9: Create mDL Authorization Request (Verifier) ──────────────────────
step "9" "Create mDL Authorization Request (Verifier)"
# Build mdoc path strings: $['org.iso.18013.5.1']['field_name']
MDL_PATH_FAMILY=$(printf '$['"'"'org.iso.18013.5.1'"'"']['"'"'family_name'"'"']')
MDL_PATH_GIVEN=$(printf  '$['"'"'org.iso.18013.5.1'"'"']['"'"'given_name'"'"']')
MDL_PATH_BIRTH=$(printf  '$['"'"'org.iso.18013.5.1'"'"']['"'"'birth_date'"'"']')
MDL_PATH_DOCNUM=$(printf '$['"'"'org.iso.18013.5.1'"'"']['"'"'document_number'"'"']')

AUTH_REQUEST=$(curl -s -X POST "$VERIFIER_API/openid4vc/verify" \
  -H 'accept: */*' \
  -H 'authorizeBaseUrl: openid4vp://authorize' \
  -H 'responseMode: direct_post_jwt' \
  -H 'openId4VPProfile: ISO_18013_7_MDOC' \
  -H 'Content-Type: application/json' \
  -d "$(jq -n \
    --arg iacaCertPem "$IACA_CERT_PEM" \
    --arg p1 "$MDL_PATH_FAMILY" \
    --arg p2 "$MDL_PATH_GIVEN" \
    --arg p3 "$MDL_PATH_BIRTH" \
    --arg p4 "$MDL_PATH_DOCNUM" \
    '{
      request_credentials: [{
        id: "mDL-request",
        input_descriptor: {
          id: "org.iso.18013.5.1.mDL",
          format: {mso_mdoc: {alg: ["ES256"]}},
          constraints: {
            fields: [
              {path: [$p1], intent_to_retain: false},
              {path: [$p2], intent_to_retain: false},
              {path: [$p3], intent_to_retain: false},
              {path: [$p4], intent_to_retain: false}
            ],
            limit_disclosure: "required"
          }
        }
      }],
      trusted_root_cas: [$iacaCertPem],
      openid_profile: "ISO_18013_7_MDOC"
    }')")
ok "Auth request: ${AUTH_REQUEST:0:80}..."

# ISO 18013-7 uses request_uri; the session ID is the last path segment of that URI
REQUEST_URI_ENC=$(echo "$AUTH_REQUEST" | grep -oE 'request_uri=[^&]+' | cut -d= -f2-)
REQUEST_URI=$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$REQUEST_URI_ENC")
STATE=$(basename "$REQUEST_URI")
[[ -n "$STATE" ]] || fail "Could not extract state from auth request: $AUTH_REQUEST"
info "State (session ID): $STATE"
vlog_step "9" "Create mDL Auth Request" "POST" "$VERIFIER_API/openid4vc/verify" \
  '{"openid_profile":"ISO_18013_7_MDOC","request_credentials":[{"id":"mDL-request"}]}' \
  "$AUTH_REQUEST"

# ── Step 10: Match Credentials for Presentation Definition ───────────────────
step "10" "Match Credentials for Presentation Definition"
# The presentation_definition is inside the request object JWT at request_uri
REQUEST_URI_LOCAL=$(echo "$REQUEST_URI" | sed 's/host\.docker\.internal/localhost/g')
info "Fetching request JWT from: $REQUEST_URI_LOCAL"
REQUEST_JWT=$(curl -s "$REQUEST_URI_LOCAL")
PRESENTATION_DEF=$(echo "$REQUEST_JWT" | python3 -c "
import sys, json, base64, zlib
jwt = sys.stdin.read().strip()
parts = jwt.split('.')
result = {}
try:
    if len(parts) >= 2:
        p = parts[1] + '=' * (4 - len(parts[1]) % 4)
        raw = base64.urlsafe_b64decode(p)
        try:
            payload = json.loads(raw)
        except (UnicodeDecodeError, ValueError):
            # Try deflate decompression (zip: DEF header)
            payload = json.loads(zlib.decompress(raw, -15))
        result = payload.get('presentation_definition', {})
    else:
        result = json.loads(jwt).get('presentation_definition', {})
except Exception:
    pass  # verifier2 uses dcql_query; presentation_definition will be absent
print(json.dumps(result))
")
echo "$PRESENTATION_DEF" | jq .

CRED_ID=""
if [[ "$PRESENTATION_DEF" != "{}" && -n "$PRESENTATION_DEF" ]]; then
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
  info "Credential matching returned empty (mso_mdoc not indexed); using claimed credential ID"
  CRED_ID="$CLAIMED_CRED_ID"
fi
ok "Using credential ID: $CRED_ID"
vlog_step "10a" "Fetch JAR JWT (Request Object)" "GET" "$REQUEST_URI_LOCAL" "" "$REQUEST_JWT"
vlog_step "10b" "Match Credentials for PD" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/matchCredentialsForPresentationDefinition" \
  "$PRESENTATION_DEF" "${MATCHING_CREDS:-}"

# ── Step 11: Resolve Presentation Request ────────────────────────────────────
step "11" "Resolve Presentation Request"
AUTH_REQUEST_FIXED=$(echo "$AUTH_REQUEST" | sed 's/localhost/host.docker.internal/g')

RESOLVED_REQUEST=$(curl -s -X POST \
  "$WALLET_API/wallet/$WALLET_ID/exchange/resolvePresentationRequest" \
  -H 'accept: text/plain' \
  -H 'Content-Type: text/plain' \
  -H "authorization: Bearer $TOKEN" \
  --data-raw "$AUTH_REQUEST_FIXED")
info "Resolved: ${RESOLVED_REQUEST:0:80}..."
vlog_step "11" "Resolve Presentation Request" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/resolvePresentationRequest" \
  "$AUTH_REQUEST_FIXED" "$RESOLVED_REQUEST"

# ── Step 12: Fulfill mDL Presentation Request ────────────────────────────────
step "12" "Fulfill mDL Presentation Request (usePresentationRequest)"
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
vlog_step "12" "Fulfill mDL Presentation Request" "POST" \
  "$WALLET_API/wallet/$WALLET_ID/exchange/usePresentationRequest" \
  "$PRESENT_PAYLOAD" "$PRESENT_RESPONSE"

# ── Step 13: Verify mDL Presentation ─────────────────────────────────────────
step "13" "Verify mDL Presentation"
VERIFICATION=$(curl -s -X GET "$VERIFIER_API/openid4vc/session/$STATE" \
  -H 'accept: */*')
echo "$VERIFICATION" | jq .
VERIFY_RESULT=$(echo "$VERIFICATION" | jq -r '.verificationResult // empty')
vlog_step "13" "Check Verification Result" "GET" "$VERIFIER_API/openid4vc/session/$STATE" \
  "" "$VERIFICATION"
[[ "$VERIFY_RESULT" == "true" ]] && ok "Verification SUCCESS" || fail "Verification failed: $VERIFY_RESULT"

# ── Done ─────────────────────────────────────────────────────────────────────
if $VERBOSE; then
  _VLOG_DIR="$(dirname "${BASH_SOURCE[0]}")/demo"
  mkdir -p "$_VLOG_DIR"
  _VLOG_OUT="$_VLOG_DIR/mdoc-steps.json"
  jq -s '.' "$_VLOG_TMP" > "$_VLOG_OUT"
  ok "Verbose step data written to: $_VLOG_OUT"
fi
rm -f "$_VLOG_TMP"
echo -e "\n${BOLD}${GREEN}All steps completed.${NC}"
