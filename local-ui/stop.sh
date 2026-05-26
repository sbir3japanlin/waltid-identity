#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "UI server is not running (no PID file found)."
  exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  rm -f "$PID_FILE"
  echo "Walt.id Demo UI stopped (PID $PID)."
else
  rm -f "$PID_FILE"
  echo "UI server was not running (stale PID $PID removed)."
fi
