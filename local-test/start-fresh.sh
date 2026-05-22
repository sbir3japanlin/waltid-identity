#!/bin/bash
set -euo pipefail

pushd "$(dirname "$0")/../docker-compose" > /dev/null

docker compose down -v
rm -rf ./wallet-api/data/*
docker compose up -d

popd > /dev/null

