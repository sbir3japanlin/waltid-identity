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
