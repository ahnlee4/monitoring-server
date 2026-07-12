#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${GATEWAY_ENV_FILE:-${ROOT_DIR}/.env.gateway}"

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${ROOT_DIR}/docker-compose.gateway.yml" \
  logs -f --tail=200
