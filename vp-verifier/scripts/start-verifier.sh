#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INTEGRATION_DIR="$(dirname "$SCRIPT_DIR")"

cd "$INTEGRATION_DIR"

PORT="${VP_VERIFIER_PORT:-7005}"

if ss -tlnp | grep -q ":$PORT " 2>/dev/null; then
  STALE=$(ps aux | grep "docker-proxy.*$PORT" | grep -v grep | awk '{print $2}')
  if [ -n "$STALE" ]; then
    echo ""
    echo "ERROR: Port $PORT is held by stale docker-proxy processes." >&2
    echo "Kill them with:  sudo kill $STALE" >&2
    echo "Then re-run this script." >&2
    exit 1
  fi
  echo ""
  echo "ERROR: Port $PORT is already in use." >&2
  echo "Check: lsof -i :$PORT" >&2
  exit 1
fi

echo "Pulling waltid/verifier-api2:latest..."
docker compose pull

echo "Starting verifier-api..."
docker compose up -d

echo "Waiting for verifier-api to become healthy..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '%{http_code}' -X POST "http://localhost:$PORT/verification-session/create" -H "Content-Type: application/json" -d '{}' 2>/dev/null | grep -qE '^(200|201|400)'; then
    echo ""
    echo "Verifier API is ready at http://localhost:$PORT"
    echo ""
    echo "Run the example:"
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
