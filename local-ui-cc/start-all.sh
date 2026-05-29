#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_COMPOSE_DIR="$SCRIPT_DIR/../docker-compose"

echo "Starting Docker Compose services..."

if [[ -f "$DOCKER_COMPOSE_DIR/docker-compose.yaml" ]]; then
  (cd "$DOCKER_COMPOSE_DIR" && docker compose up -d)
  echo "  Docker Compose services started."
else
  echo "  docker-compose.yaml not found at $DOCKER_COMPOSE_DIR — skipping."
fi

echo ""
echo "Starting Wallet UI on http://localhost:5173"
echo "Starting Issuer UI on http://localhost:5174"
echo "Starting Verifier UI on http://localhost:5175"
echo ""

(cd "$SCRIPT_DIR/wallet-ui" && npx vite --host &)
(cd "$SCRIPT_DIR/issuer-ui" && npx vite --host &)
(cd "$SCRIPT_DIR/verifier-ui" && npx vite --host &)

echo "All three UIs starting..."
echo "  Wallet:   http://localhost:5173"
echo "  Issuer:   http://localhost:5174"
echo "  Verifier: http://localhost:5175"
echo ""
echo "Press Ctrl+C to stop all."

wait
