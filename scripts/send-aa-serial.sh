#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-${RS485_SERIAL_PORT:-/dev/ttyUSB0}}"
BAUDRATE="${2:-${RS485_BAUDRATE:-9600}}"
INTERVAL_SECONDS="${3:-1}"

if [[ ! -e "$PORT" ]]; then
  echo "Serial port not found: $PORT" >&2
  exit 1
fi

stty -F "$PORT" "$BAUDRATE" cs8 -cstopb -parenb -ixon -ixoff -crtscts raw -echo

echo "Sending 0xAA to $PORT at ${BAUDRATE}bps every ${INTERVAL_SECONDS}s"
echo "Stop with Ctrl-C"

while true; do
  printf '\xAA' > "$PORT"
  printf '%(%Y-%m-%d %H:%M:%S)T sent: AA\n' -1
  sleep "$INTERVAL_SECONDS"
done
