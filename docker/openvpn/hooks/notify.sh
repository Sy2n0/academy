#!/bin/sh
# Reports tunnel state to HUB ACADEMY.
#
# OpenVPN runs this on connect and disconnect. A link that drops without a clean
# teardown never sends the disconnect, so the app ages a "connected" row out of
# its trust window rather than believing it forever.
#
# OpenVPN provides: common_name, ifconfig_pool_remote_ip, bytes_received,
# bytes_sent. A failure here must never stop the tunnel, so every path exits 0.
set -u

EVENT="$1"

[ -z "${PLATFORM_URL:-}" ] && exit 0
[ -z "${PLATFORM_API_KEY:-}" ] && exit 0
[ -z "${common_name:-}" ] && exit 0

curl -s -m 5 -X POST "${PLATFORM_URL}/api/vpn/events" \
  -H 'Content-Type: application/json' \
  -H "X-Api-Key: ${PLATFORM_API_KEY}" \
  -d "{
    \"event\": \"${EVENT}\",
    \"commonName\": \"${common_name}\",
    \"virtualIp\": \"${ifconfig_pool_remote_ip:-}\",
    \"bytesIn\": ${bytes_received:-0},
    \"bytesOut\": ${bytes_sent:-0}
  }" >/dev/null 2>&1

exit 0
