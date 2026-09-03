# A stand-in machine for verifying the VPN path end to end.
#
# Serves one page on the port the Machine record declares, echoing the FLAG the
# platform injects. That is enough to prove three things at once: the container
# starts, it is reachable only from the machine network, and the per-instance
# flag actually reaches it.
FROM alpine:3.20

RUN apk add --no-cache busybox-extras

WORKDIR /srv
RUN printf '#!/bin/sh\nmkdir -p /srv/www\nprintf "<h1>HUB test machine</h1><p>flag: %%s</p>" "${FLAG:-no-flag-injected}" > /srv/www/index.html\nexec httpd -f -p "${PORT:-20000}" -h /srv/www\n' > /srv/start.sh \
  && chmod +x /srv/start.sh

EXPOSE 20000
CMD ["/srv/start.sh"]
