#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${GATEWAY_ENV_FILE:-${ROOT_DIR}/.env.gateway}"
TEMPLATE_FILE="${ROOT_DIR}/.env.gateway.example"

if [[ -e "${ENV_FILE}" ]]; then
  echo "게이트웨이 환경 파일이 이미 존재합니다: ${ENV_FILE}" >&2
  exit 1
fi

db_password="$(openssl rand -hex 32)"
admin_password="$(openssl rand -hex 32)"

cp "${TEMPLATE_FILE}" "${ENV_FILE}"
sed -i "s/change-this-database-password/${db_password}/g" "${ENV_FILE}"
sed -i "s/change-this-to-a-long-random-password/${admin_password}/g" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

echo "게이트웨이 환경 파일을 생성했습니다: ${ENV_FILE}"
echo "최초 관리자 비밀번호는 해당 파일의 GATEWAY_ADMIN_PASSWORD에서 확인하세요."
