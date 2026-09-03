#!/bin/sh
# Reports the full list of connected clients to HUB ACADEMY, on a loop.
#
# client-connect fires once and client-disconnect is skipped whenever a tunnel
# dies rather than closes, so the two hooks alone cannot keep state true. This
# reads OpenVPN's own status file — which the server rewrites on an interval —
# and sends who is actually up. The app refreshes those and drops the rest.
#
# Requires the server config to carry:
#   status /etc/openvpn/openvpn-status.log
#   status-version 2
set -u

STATUS_FILE="${VPN_STATUS_FILE:-/etc/openvpn/openvpn-status.log}"
INTERVAL="${VPN_SYNC_INTERVAL:-60}"

if [ -z "${PLATFORM_URL:-}" ] || [ -z "${PLATFORM_API_KEY:-}" ]; then
  echo "vpn-sync: PLATFORM_URL and PLATFORM_API_KEY are required" >&2
  exit 1
fi

GEO_DIR="${VPN_GEO_DIR:-/geo}"
ALLOWED="${VPN_ALLOWED_COUNTRIES:-kr}"
GEO_REFRESH="${VPN_GEO_REFRESH:-86400}"
GEO_STAMP="$GEO_DIR/.updated"

# The country lists live here rather than in the OpenVPN image because they have
# to be refreshed: allocations change, and a list that silently rots turns into
# students being locked out of their own country.
refresh_geo() {
  mkdir -p "$GEO_DIR" 2>/dev/null || return 0
  for CC in $ALLOWED; do
    TMP="$GEO_DIR/$CC.zone.tmp"
    if curl -sf -m 60 -o "$TMP" \
      "https://www.ipdeny.com/ipblocks/data/countries/${CC}.zone" &&
      [ -s "$TMP" ]; then
      # Swapped into place only once complete, so a half-downloaded file never
      # becomes the list a connection is judged against.
      mv "$TMP" "$GEO_DIR/$CC.zone"
      echo "vpn-sync: refreshed $CC ($(wc -l < "$GEO_DIR/$CC.zone") ranges)"
    else
      rm -f "$TMP"
      echo "vpn-sync: WARNING could not refresh $CC list" >&2
    fi
  done
  date +%s > "$GEO_STAMP"
}

LAST_GEO=0
[ -r "$GEO_STAMP" ] && LAST_GEO=$(cat "$GEO_STAMP" 2>/dev/null || echo 0)

while true; do
  NOW=$(date +%s)
  if [ $((NOW - LAST_GEO)) -ge "$GEO_REFRESH" ]; then
    refresh_geo
    LAST_GEO=$NOW
  fi

  if [ -r "$STATUS_FILE" ]; then
    # status-version 2 rows are:
    #   CLIENT_LIST,<common name>,<real address>,<virtual v4>,<virtual v6>,
    #   <bytes received>,<bytes sent>,...
    CLIENTS=$(awk -F, '
      $1 == "CLIENT_LIST" && $2 != "" && $2 != "UNDEF" {
        if (n++) printf ","
        printf "{\"commonName\":\"%s\",\"virtualIp\":\"%s\",\"bytesIn\":%s,\"bytesOut\":%s}",
          $2, $4, ($6 == "" ? 0 : $6), ($7 == "" ? 0 : $7)
      }
    ' "$STATUS_FILE")

    curl -s -m 10 -X POST "${PLATFORM_URL}/api/vpn/events" \
      -H 'Content-Type: application/json' \
      -H "X-Api-Key: ${PLATFORM_API_KEY}" \
      -d "{\"event\":\"sync\",\"clients\":[${CLIENTS}]}" >/dev/null 2>&1
  fi

  sleep "$INTERVAL"
done
