#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

docker compose -f docker-compose.yml -f docker-compose.hostnet.yml up -d --build

echo "Monitoring server started in host-network mode"
echo "Open: http://localhost"
