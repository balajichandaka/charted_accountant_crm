#!/usr/bin/env bash
# Runs on the EC2 instance (called by GitHub Actions over SSH).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/charted_accountant_crm}"
BRANCH="${DEPLOY_BRANCH:-prod}"
COMPOSE_FILE="docker-compose.yml"

if [ ! -d "$APP_DIR" ]; then
  echo "Missing app directory: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing $COMPOSE_FILE in $APP_DIR"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "Missing .env — GitHub Actions should run scripts/write-env.sh first."
  exit 1
fi

echo "==> Pulling latest code ($BRANCH)"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
chmod +x scripts/deploy-ec2.sh scripts/compose.sh scripts/write-env.sh 2>/dev/null || true

COMPOSE="./scripts/compose.sh"

echo "==> Disk space"
df -h / | tail -1
docker system df 2>/dev/null || true

AVAIL_KB=$(df / | awk 'NR==2 {print $4}')
if [ "${AVAIL_KB:-0}" -lt 2097152 ]; then
  echo "WARNING: Less than 2GB free on /. Docker builds may fail."
  echo "Run: docker system prune -af && docker builder prune -af"
fi

echo "==> Pruning unused Docker data before build"
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true

echo "==> Building and starting containers"
"$COMPOSE" -f "$COMPOSE_FILE" build
"$COMPOSE" -f "$COMPOSE_FILE" up -d

echo "==> Pruning dangling images"
docker image prune -f

echo "==> Deploy complete"
"$COMPOSE" -f "$COMPOSE_FILE" ps
