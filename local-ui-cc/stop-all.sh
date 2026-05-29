#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_COMPOSE_DIR="$SCRIPT_DIR/../docker-compose"

echo "Stopping UI dev servers..."

for port in 5173 5174 5175; do
  PID=$(lsof -ti ":$port" 2>/dev/null || true)
  if [[ -n "$PID" ]]; then
    kill "$PID" 2>/dev/null && echo "  Stopped process on port $port (PID $PID)" || true
  else
    echo "  No process found on port $port"
  fi
done

echo ""
echo "Stopping Docker Compose services..."

if [[ -f "$DOCKER_COMPOSE_DIR/docker-compose.yaml" ]]; then
  (cd "$DOCKER_COMPOSE_DIR" && docker compose down)
  echo "  Docker Compose services stopped."
else
  echo "  docker-compose.yaml not found at $DOCKER_COMPOSE_DIR — skipping."
fi

echo ""
echo "All UIs and services stopped."
