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
