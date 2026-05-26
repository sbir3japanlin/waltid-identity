#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/server.log"

if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "UI server is already running (PID $PID)."
    echo "  Wallet:   http://localhost:8001"
    echo "  Issuer:   http://localhost:8002"
    echo "  Verifier: http://localhost:8003"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

cd "$SCRIPT_DIR"
python3 server.py >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

PID=$(cat "$PID_FILE")
if ! kill -0 "$PID" 2>/dev/null; then
  echo "ERROR: server failed to start. Check $LOG_FILE"
  exit 1
fi

echo "Walt.id Demo UI started (PID $PID)."
echo "  Wallet:   http://localhost:8001"
echo "  Issuer:   http://localhost:8002"
echo "  Verifier: http://localhost:8003"
echo "  Logs:     $LOG_FILE"
echo "  Stop:     $SCRIPT_DIR/stop.sh"
