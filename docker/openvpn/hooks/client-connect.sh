#!/bin/sh
# Refusing here refuses the tunnel — OpenVPN treats a non-zero client-connect as
# a denied connection — so the country check runs before anything is reported.
set -e
/etc/openvpn/hooks/geo-check.sh
exec /etc/openvpn/hooks/notify.sh connect
