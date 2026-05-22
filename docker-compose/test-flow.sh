#!/bin/bash
# Walt.id Identity Stack - End-to-end credential issuance test
# Usage: ./test-flow.sh [email] [password]


# docker compose down -v 
# rm -rf ./wallet-api/data/*

set -euo pipefail

WALLET_API="http://localhost:7001/wallet-api"
ISSUER_API="http://localhost:7002"

EMAIL="${1:-test@email.com}"
PASSWORD="${2:-test}"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step() { echo -e "\n${BOLD}${CYAN}=== Step $1: $2 ===${NC}"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Dependency check ──────────────────────────────────────────────────────────
command -v jq  >/dev/null 2>&1 || fail "jq is required. Install with: brew install jq"
command -v curl >/dev/null 2>&1 || fail "curl is required."

# ── Step 0: Register account ──────────────────────────────────────────────────
step "0" "Register account ($EMAIL)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$WALLET_API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"email\",\"name\":\"Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  ok "Account registered"
else
  info "Registration returned HTTP $HTTP_CODE — account may already exist, continuing..."
fi

# ── Step 1: Login ─────────────────────────────────────────────────────────────
step "1" "Login"
LOGIN=$(curl -s -X POST "$WALLET_API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"email\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | jq -r '.token // empty')
[[ -n "$TOKEN" ]] || fail "Login failed: $LOGIN"
ok "Token: ${TOKEN:0:50}..."

# ── Step 2: Retrieve Wallet ID ────────────────────────────────────────────────
step "2" "Retrieve Wallet ID"
WALLETS=$(curl -s "$WALLET_API/wallet/accounts/wallets" \
  -H "authorization: Bearer $TOKEN")
WALLET_ID=$(echo "$WALLETS" | jq -r '.wallets[0].id // empty')
[[ -n "$WALLET_ID" ]] || fail "No wallet found: $WALLETS"
ok "Wallet ID: $WALLET_ID"

# ── Step 3: Retrieve Key ──────────────────────────────────────────────────────
step "3" "Retrieve Key"
KEYS=$(curl -s "$WALLET_API/wallet/$WALLET_ID/keys" \
  -H "authorization: Bearer $TOKEN")
echo "$KEYS" | jq .
KEY_ID=$(echo "$KEYS" | jq -r '.[0].keyId.id // empty')
ok "Key ID: $KEY_ID"

# ── Step 4: Retrieve DID ──────────────────────────────────────────────────────
step "4" "Retrieve DID"
DIDS=$(curl -s "$WALLET_API/wallet/$WALLET_ID/dids" \
  -H "authorization: Bearer $TOKEN")
echo "$DIDS" | jq '[.[] | {did, alias, default}]'
DID=$(echo "$DIDS" | jq -r '.[0].did // empty')
[[ -n "$DID" ]] || fail "No DID found: $DIDS"
ok "DID: $DID"

# ── Step 5: Retrieve VC well-known config ────────────────────────────────────
step "5" "Retrieve VC well-known config"
curl -s "$ISSUER_API/draft13/.well-known/openid-configuration" | jq .

# ── Step 6: Onboard Issuer ───────────────────────────────────────────────────
step "6" "Onboard Issuer"
ISSUER=$(curl -s -X POST "$ISSUER_API/onboard/issuer" \
  -H 'Content-Type: application/json' \
  -d '{"key":{"keyType":"secp256r1"}}')
ISSUER_KEY=$(echo "$ISSUER" | jq -c '.issuerKey // empty')
ISSUER_DID=$(echo "$ISSUER" | jq -r '.issuerDid // empty')
[[ -n "$ISSUER_DID" ]] || fail "Onboard issuer failed: $ISSUER"
ok "Issuer DID: $ISSUER_DID"

# ── Step 7: Create Credential Offer ─────────────────────────────────────────
step "7" "Create Credential Offer"
ISSUE_PAYLOAD=$(jq -n \
  --argjson issuerKey "$ISSUER_KEY" \
  --arg issuerDid "$ISSUER_DID" \
  '{
    issuerKey: $issuerKey,
    issuerDid: $issuerDid,
    credentialConfigurationId: "UniversityDegree_jwt_vc_json",
    credentialData: {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1"
      ],
      id: "http://example.gov/credentials/3732",
      type: ["VerifiableCredential","UniversityDegree"],
      issuer: {id: "did:web:vc.transmute.world"},
      issuanceDate: "2020-03-10T04:24:12.164Z",
      credentialSubject: {
        id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
        degree: {type: "BachelorDegree", name: "Bachelor of Science and Arts"}
      }
    },
    mapping: {
      id: "<uuid>",
      issuer: {id: "<issuerDid>"},
      credentialSubject: {id: "<subjectDid>"},
      issuanceDate: "<timestamp>",
      expirationDate: "<timestamp-in:365d>"
    },
    authenticationMethod: "PRE_AUTHORIZED",
    standardVersion: "DRAFT13"
  }')

OFFER_URI=$(curl -s -X POST "$ISSUER_API/openid4vc/jwt/issue" \
  -H 'Content-Type: application/json' \
  -d "$ISSUE_PAYLOAD")
ok "Raw offer URI: $OFFER_URI"

# wallet-api runs inside Docker and cannot reach the host via "localhost";
# replace with host.docker.internal so Docker can resolve it to the host machine.
OFFER_URI_FIXED=$(echo "$OFFER_URI" | sed 's/localhost/host.docker.internal/g')
info "Fixed offer URI: $OFFER_URI_FIXED"

# ── Step 8/9: Inspect offer content ─────────────────────────────────────────
step "8/9" "Inspect offer content"
OFFER_ID=$(echo "$OFFER_URI" | grep -oE 'id=[^&]+' | cut -d= -f2 || true)
if [[ -n "$OFFER_ID" ]]; then
  info "Offer ID: $OFFER_ID"
  curl -s "$ISSUER_API/draft13/credentialOffer?id=$OFFER_ID" | jq .
else
  info "Could not extract offer ID from URI, skipping content check"
fi

# ── Step 10: Claim credential into wallet ────────────────────────────────────
step "10" "Claim credential (useOfferRequest)"
CREDENTIAL_RESPONSE=$(curl -s -X POST \
  "$WALLET_API/wallet/$WALLET_ID/exchange/useOfferRequest" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d "$OFFER_URI_FIXED")

echo "$CREDENTIAL_RESPONSE" | jq . 2>/dev/null || echo "$CREDENTIAL_RESPONSE"

# ── Done ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}All steps completed.${NC}"
