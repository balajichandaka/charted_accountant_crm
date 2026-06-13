#!/usr/bin/env bash
# Docker Compose v5+ needs buildx 0.17+. Run once on Amazon Linux EC2.
set -euo pipefail

ARCH=$(uname -m)
case "$ARCH" in
  x86_64) BUILDX_ARCH=amd64 ;;
  aarch64) BUILDX_ARCH=arm64 ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

VERSION="v0.34.1"
PLUGIN_DIR="/usr/local/lib/docker/cli-plugins"
PLUGIN_PATH="${PLUGIN_DIR}/docker-buildx"

sudo mkdir -p "$PLUGIN_DIR"
sudo curl -fsSL "https://github.com/docker/buildx/releases/download/${VERSION}/buildx-${VERSION}.linux-${BUILDX_ARCH}" \
  -o "$PLUGIN_PATH"
sudo chmod +x "$PLUGIN_PATH"

docker buildx version
echo "buildx installed at $PLUGIN_PATH"
