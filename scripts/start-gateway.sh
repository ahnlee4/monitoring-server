#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${GATEWAY_ENV_FILE:-${ROOT_DIR}/.env.gateway}"
CERT_DIR="/etc/letsencrypt/live/tms.theintech.co.kr"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "게이트웨이 환경 파일이 없습니다: ${ENV_FILE}" >&2
  echo "cp .env.gateway.example .env.gateway 후 비밀번호를 변경하세요." >&2
  exit 1
fi

if [[ ! -f "${CERT_DIR}/fullchain.pem" || ! -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "TLS 인증서를 찾을 수 없습니다: ${CERT_DIR}" >&2
  echo "tms.theintech.co.kr 및 하위 서버 도메인을 포함한 인증서를 먼저 설치하세요." >&2
  exit 1
fi

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${ROOT_DIR}/docker-compose.gateway.yml" \
  up -d --build

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${ROOT_DIR}/docker-compose.gateway.yml" \
  ps
