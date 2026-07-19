#!/usr/bin/env bash
set -euo pipefail

if [[ -f /etc/default/monitoring-kiosk ]]; then
  # shellcheck disable=SC1091
  source /etc/default/monitoring-kiosk
fi

DASHBOARD_URL="${KIOSK_URL:-http://127.0.0.1}"
HEALTH_URL="${KIOSK_HEALTH_URL:-${DASHBOARD_URL%/}/api/health}"
POLL_SECONDS="${KIOSK_HEALTH_POLL_SECONDS:-2}"
RESTART_SECONDS="${KIOSK_RESTART_SECONDS:-3}"
STATE_DIR="${XDG_STATE_HOME:-${HOME}/.local/state}/monitoring-kiosk"
PROFILE_DIR="${HOME}/.config/monitoring-kiosk/chromium"

mkdir -p "${STATE_DIR}" "${PROFILE_DIR}"
exec >>"${STATE_DIR}/kiosk.log" 2>&1

find_browser() {
  local candidate
  for candidate in chromium-browser chromium google-chrome-stable google-chrome /snap/bin/chromium; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      command -v "${candidate}"
      return 0
    fi
    if [[ "${candidate}" = /* && -x "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done
  return 1
}

BROWSER="$(find_browser || true)"
if [[ -z "${BROWSER}" ]]; then
  echo "Chromium 계열 브라우저를 찾을 수 없습니다."
  exit 127
fi

xset s off >/dev/null 2>&1 || true
xset -dpms >/dev/null 2>&1 || true
xset s noblank >/dev/null 2>&1 || true

echo "로컬 모니터링 서버 대기: ${HEALTH_URL}"
until curl --connect-timeout 2 --max-time 3 -fsS "${HEALTH_URL}" >/dev/null; do
  sleep "${POLL_SECONDS}"
done

echo "키오스크 실행: ${DASHBOARD_URL}"
while true; do
  "${BROWSER}" \
    --kiosk \
    --incognito \
    --no-first-run \
    --no-default-browser-check \
    --disable-infobars \
    --noerrdialogs \
    --disable-session-crashed-bubble \
    --disable-features=Translate \
    --user-data-dir="${PROFILE_DIR}" \
    "${DASHBOARD_URL}" || true
  echo "브라우저가 종료되어 ${RESTART_SECONDS}초 후 다시 실행합니다."
  sleep "${RESTART_SECONDS}"
done
