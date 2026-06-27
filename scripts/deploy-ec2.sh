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

PUBLIC_IP="$(curl -sf http://checkip.amazonaws.com 2>/dev/null || hostname -I | awk '{print $1}')"
echo "==> Deploy on EC2: env=${DEPLOY_ENV:-unknown} branch=$BRANCH profile=${WRITE_ENV_PROFILE:-unknown} ip=${PUBLIC_IP:-unknown} dir=$APP_DIR"

echo "==> Pulling latest code ($BRANCH)"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
chmod +x scripts/deploy-ec2.sh scripts/compose.sh scripts/write-env.sh 2>/dev/null || true

if [ -f scripts/write-env.sh ]; then
  ./scripts/write-env.sh
fi

COMPOSE="./scripts/compose.sh"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "==> Disk space"
df -h / | tail -1
docker system df 2>/dev/null || true

AVAIL_KB=$(df / | awk 'NR==2 {print $4}')
if [ "${AVAIL_KB:-0}" -lt 2097152 ]; then
  echo "WARNING: Less than 2GB free on / — pruning unused Docker data (slower next build)."
  docker builder prune -af 2>/dev/null || true
  docker image prune -af 2>/dev/null || true
fi

echo "==> Building and starting containers"
MEM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo 0)
if [ "${MEM_MB:-0}" -ge 3500 ]; then
  echo "==> Memory ${MEM_MB}MB — parallel build"
  "$COMPOSE" -f "$COMPOSE_FILE" build --parallel --progress=plain
else
  echo "==> Memory ${MEM_MB}MB — sequential build (avoids OOM on small instances)"
  "$COMPOSE" -f "$COMPOSE_FILE" build --progress=plain backend
  "$COMPOSE" -f "$COMPOSE_FILE" build --progress=plain frontend
fi
"$COMPOSE" -f "$COMPOSE_FILE" up -d

echo "==> Pruning dangling images"
docker image prune -f

echo "==> Deploy complete"
"$COMPOSE" -f "$COMPOSE_FILE" ps
