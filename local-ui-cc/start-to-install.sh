#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing npm dependencies for local-ui-cc..."
echo ""

echo "Installing shared package dependencies..."
(cd "$SCRIPT_DIR/shared" && npm install)
echo "✓ shared dependencies installed"
echo ""

echo "Installing issuer-ui dependencies..."
(cd "$SCRIPT_DIR/issuer-ui" && npm install)
echo "✓ issuer-ui dependencies installed"
echo ""

echo "Installing verifier-ui dependencies..."
(cd "$SCRIPT_DIR/verifier-ui" && npm install)
echo "✓ verifier-ui dependencies installed"
echo ""

echo "Installing wallet-ui dependencies..."
(cd "$SCRIPT_DIR/wallet-ui" && npm install)
echo "✓ wallet-ui dependencies installed"
echo ""

echo "All dependencies installed successfully!"
echo ""
echo "You can now run ./start-all.sh to launch the UIs."
