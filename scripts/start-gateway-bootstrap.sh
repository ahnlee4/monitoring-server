#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${GATEWAY_ENV_FILE:-${ROOT_DIR}/.env.gateway}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "게이트웨이 환경 파일이 없습니다: ${ENV_FILE}" >&2
  echo "./scripts/init-gateway-env.sh를 먼저 실행하세요." >&2
  exit 1
fi

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${ROOT_DIR}/docker-compose.gateway.yml" \
  -f "${ROOT_DIR}/docker-compose.gateway.bootstrap.yml" \
  up -d --build

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${ROOT_DIR}/docker-compose.gateway.yml" \
  -f "${ROOT_DIR}/docker-compose.gateway.bootstrap.yml" \
  ps
