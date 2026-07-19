#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [[ ! -f .env.edge ]]; then
  cp .env.edge.example .env.edge
  echo ".env.edge를 생성했습니다. EDGE_NODE_ID, EDGE_NODE_TOKEN, EDGE_SERVER_URL을 설정한 뒤 다시 실행하세요." >&2
  exit 1
fi

docker compose --env-file .env.edge -f docker-compose.board.yml pull edge-agent
docker compose --env-file .env.edge -f docker-compose.board.yml up -d edge-agent

echo "보드 edge-agent가 시작되었습니다."
echo "상태 확인: docker compose --env-file .env.edge -f docker-compose.board.yml ps"
