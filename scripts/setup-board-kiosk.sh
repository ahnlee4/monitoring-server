#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "sudo로 실행하세요: sudo ./scripts/setup-board-kiosk.sh [사용자] [대시보드 URL]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_USER="${1:-${SUDO_USER:-linaro}}"
DASHBOARD_URL="${2:-http://127.0.0.1}"
HEALTH_BASE_URL="${DASHBOARD_URL%%\?*}"
USER_ENTRY="$(getent passwd "${TARGET_USER}" || true)"

if [[ -z "${USER_ENTRY}" ]]; then
  echo "사용자를 찾을 수 없습니다: ${TARGET_USER}" >&2
  exit 1
fi

TARGET_HOME="$(printf '%s' "${USER_ENTRY}" | cut -d: -f6)"
TARGET_GROUP="$(id -gn "${TARGET_USER}")"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl dbus-x11 lightdm openbox x11-xserver-utils xorg

browser_available() {
  command -v chromium-browser >/dev/null 2>&1 \
    || command -v chromium >/dev/null 2>&1 \
    || command -v google-chrome-stable >/dev/null 2>&1 \
    || command -v google-chrome >/dev/null 2>&1 \
    || [[ -x /snap/bin/chromium ]]
}

if ! browser_available; then
  if apt-cache show chromium-browser >/dev/null 2>&1; then
    apt-get install -y chromium-browser || true
  fi
fi

if ! browser_available; then
  if apt-cache show chromium >/dev/null 2>&1; then
    apt-get install -y chromium || true
  fi
fi

if ! browser_available && command -v snap >/dev/null 2>&1; then
  snap install chromium
fi

if ! browser_available; then
  echo "Chromium 설치에 실패했습니다. chromium 또는 chromium-browser를 설치한 뒤 다시 실행하세요." >&2
  exit 1
fi

install -m 0755 "${ROOT_DIR}/scripts/launch-board-kiosk.sh" /usr/local/bin/monitoring-kiosk

cat > /etc/default/monitoring-kiosk <<EOF
KIOSK_URL="${DASHBOARD_URL}"
KIOSK_HEALTH_URL="${HEALTH_BASE_URL%/}/api/health"
KIOSK_HEALTH_POLL_SECONDS="2"
KIOSK_RESTART_SECONDS="3"
EOF

install -d -m 0755 /etc/lightdm/lightdm.conf.d
cat > /etc/lightdm/lightdm.conf.d/50-monitoring-kiosk.conf <<EOF
[Seat:*]
autologin-user=${TARGET_USER}
autologin-user-timeout=0
user-session=openbox
EOF

OPENBOX_DIR="${TARGET_HOME}/.config/openbox"
AUTOSTART_FILE="${OPENBOX_DIR}/autostart"
install -d -o "${TARGET_USER}" -g "${TARGET_GROUP}" -m 0755 "${OPENBOX_DIR}"
touch "${AUTOSTART_FILE}"

if ! grep -Fq "/usr/local/bin/monitoring-kiosk" "${AUTOSTART_FILE}"; then
  cat >> "${AUTOSTART_FILE}" <<'EOF'

# monitoring-server board kiosk
/usr/local/bin/monitoring-kiosk &
EOF
fi

chown "${TARGET_USER}:${TARGET_GROUP}" "${AUTOSTART_FILE}"
chmod 0755 "${AUTOSTART_FILE}"

systemctl set-default graphical.target
systemctl enable --force lightdm

echo "보드 키오스크 설정 완료"
echo "자동 로그인 사용자: ${TARGET_USER}"
echo "대시보드 URL: ${DASHBOARD_URL}"
echo "적용하려면 재부팅하세요: sudo reboot"
