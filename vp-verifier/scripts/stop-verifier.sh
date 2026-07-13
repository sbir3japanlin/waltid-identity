#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VP_VERIFIER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$VP_VERIFIER_DIR"

echo "Stopping verifier-api..."
docker compose down

echo "Verifier API stopped."
