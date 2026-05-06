#!/usr/bin/env bash
set -euo pipefail

IMAGE="${PLAYGROUND_C_SANDBOX_IMAGE:-gcc:14.2.0}"

echo "[playground-sandbox] checking docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "[playground-sandbox] docker command not found"
  exit 1
fi

echo "[playground-sandbox] pulling image: ${IMAGE}"
docker pull "${IMAGE}"

echo "[playground-sandbox] done"
