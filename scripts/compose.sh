#!/usr/bin/env bash
# Use "docker compose" (plugin) or fall back to standalone "docker-compose".
set -euo pipefail

if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
fi

if command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose "$@"
fi

echo "Docker Compose is not installed."
echo "Amazon Linux 2023: sudo dnf install -y docker-compose-plugin"
echo "Amazon Linux:    sudo curl -fsSL https://github.com/docker/compose/releases/download/v5.1.4/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
exit 1
