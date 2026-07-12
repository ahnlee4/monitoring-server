#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v "${ROOT_DIR}/certbot/www:/var/www/certbot" \
  certbot/certbot:latest \
  renew --webroot --webroot-path /var/www/certbot --quiet

docker exec monitoring-gateway-nginx nginx -s reload
