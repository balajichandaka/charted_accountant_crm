#!/usr/bin/env bash
# Runs on the EC2 instance (called by GitHub Actions over SSH).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/charted_accountant_crm}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="docker-compose.yml"

cd "$APP_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing $COMPOSE_FILE in $APP_DIR"
  exit 1
fi

echo "==> Pulling latest code ($BRANCH)"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

COMPOSE="./scripts/compose.sh"

echo "==> Building and starting containers"
"$COMPOSE" -f "$COMPOSE_FILE" build
"$COMPOSE" -f "$COMPOSE_FILE" up -d

echo "==> Pruning old images"
docker image prune -f

echo "==> Deploy complete"
"$COMPOSE" -f "$COMPOSE_FILE" ps
