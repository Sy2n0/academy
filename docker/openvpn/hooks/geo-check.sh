#!/bin/sh
# Decides whether a client may connect, by where it is connecting from.
#
# OpenVPN runs this as client-connect and refuses the tunnel when it exits
# non-zero, so this is the only place a connection can be stopped before the
# client reaches the machine network.
#
# The signal is the country of trusted_ip, not the address itself: people
# connect from home, from campus and from mobile, so a per-user address is not
# a stable thing to compare against. A shared profile used from another country
# is, and that is the case this blocks.
set -u

ZONE_DIR="${VPN_GEO_DIR:-/etc/openvpn/geo}"
ALLOWED="${VPN_ALLOWED_COUNTRIES:-kr}"
FAIL_CLOSED="${VPN_GEO_FAIL_CLOSED:-false}"
IP="${trusted_ip:-}"

log() { echo "geo-check: $*" >&2; }

[ -z "$IP" ] && { log "no trusted_ip, allowing"; exit 0; }

# Loopback and RFC1918 never appear in a country list; refusing them would break
# any client reaching the server over a local network.
case "$IP" in
  127.*|10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*) exit 0 ;;
esac

MATCH=0
FOUND_LIST=0

for CC in $ALLOWED; do
  ZONE="$ZONE_DIR/$CC.zone"
  [ -s "$ZONE" ] || continue
  FOUND_LIST=1

  if awk -v ip="$IP" '
    function tonum(a,   p) { split(a, p, "."); return p[1]*16777216 + p[2]*65536 + p[3]*256 + p[4] }
    BEGIN { target = tonum(ip) }
    /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\/[0-9]+$/ {
      split($0, c, "/")
      base = tonum(c[1])
      size = 2 ^ (32 - c[2])
      if (target >= base && target < base + size) { found = 1; exit }
    }
    END { exit(found ? 0 : 1) }
  ' "$ZONE"; then
    MATCH=1
    break
  fi
done

if [ "$FOUND_LIST" -eq 0 ]; then
  # No usable list. Refusing everyone would take the platform down over a failed
  # download, so the default is to allow and say so loudly.
  if [ "$FAIL_CLOSED" = "true" ]; then
    log "no country list available, denying ${common_name:-?} from $IP"
    exit 1
  fi
  log "WARNING no country list available, allowing ${common_name:-?} from $IP unchecked"
  exit 0
fi

if [ "$MATCH" -eq 1 ]; then
  exit 0
fi

log "denied ${common_name:-?} from $IP (outside: $ALLOWED)"
exit 1
