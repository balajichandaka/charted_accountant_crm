#!/usr/bin/env bash
# Write repo-root .env from GitHub Actions secrets (profile: prod | staging).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/charted_accountant_crm}"
ENV_FILE="$APP_DIR/.env"
PROFILE="${WRITE_ENV_PROFILE:-prod}"

read_env_value() {
  local key="$1"
  local file="$2"
  grep -m1 "^${key}=" "$file" 2>/dev/null | cut -d= -f2- || true
}

if [ "$PROFILE" = "staging" ]; then
  if [ -n "${APP_PUBLIC_URL:-}" ]; then
    umask 077
    printf '%s=%s\n' APP_PUBLIC_URL "$APP_PUBLIC_URL" > "$ENV_FILE"
    printf '%s=%s\n' APP_PORT "${APP_PORT:-3000}" >> "$ENV_FILE"
    echo "Wrote staging $ENV_FILE (APP_PUBLIC_URL only)"
    exit 0
  fi
  if [ -f "$ENV_FILE" ]; then
    echo "Using existing staging $ENV_FILE"
    exit 0
  fi
  echo "Staging: no APP_PUBLIC_URL secret — using docker-compose defaults"
  exit 0
fi

# prod profile — full .env for self-hosted Postgres + admin bootstrap
#
# Postgres password is fixed when the pgdata volume is first created. GitHub secrets
# must NOT overwrite POSTGRES_* on later deploys or every connection (migrate, backend) fails.

if [ -f "$ENV_FILE" ]; then
  saved_pg_password="$(read_env_value POSTGRES_PASSWORD "$ENV_FILE")"
  if [ -n "$saved_pg_password" ]; then
    POSTGRES_USER="$(read_env_value POSTGRES_USER "$ENV_FILE")"
    POSTGRES_PASSWORD="$saved_pg_password"
    POSTGRES_DB="$(read_env_value POSTGRES_DB "$ENV_FILE")"
    echo "Preserving existing Postgres credentials from $ENV_FILE (pgdata volume password must not change on deploy)."
  fi
  if [ -z "${ADMIN_EMAIL:-}" ]; then
    ADMIN_EMAIL="$(read_env_value ADMIN_EMAIL "$ENV_FILE")"
  fi
  if [ -z "${ADMIN_PASSWORD:-}" ]; then
    ADMIN_PASSWORD="$(read_env_value ADMIN_PASSWORD "$ENV_FILE")"
  fi
  if [ -z "${ADMIN_NAME:-}" ]; then
    ADMIN_NAME="$(read_env_value ADMIN_NAME "$ENV_FILE")"
  fi
fi

if [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
  if [ -f "$ENV_FILE" ]; then
    echo "Using existing $ENV_FILE"
    exit 0
  fi
  echo "ERROR: production needs POSTGRES_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD secrets (or $ENV_FILE on EC2)."
  exit 1
fi

umask 077
{
  printf '%s=%s\n' POSTGRES_USER "${POSTGRES_USER:-ca}"
  printf '%s=%s\n' POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
  printf '%s=%s\n' POSTGRES_DB "${POSTGRES_DB:-ca_app}"
  printf '%s=%s\n' ADMIN_NAME "${ADMIN_NAME:-Administrator}"
  printf '%s=%s\n' ADMIN_EMAIL "$ADMIN_EMAIL"
  printf '%s=%s\n' ADMIN_PASSWORD "$ADMIN_PASSWORD"
  printf '%s=%s\n' APP_PUBLIC_URL "${APP_PUBLIC_URL:-https://cafirmops.in}"
  printf '%s=%s\n' APP_PORT "${APP_PORT:-3000}"
  # Stable Server Action IDs across Docker rebuilds (must match docker-compose build arg).
  printf '%s=%s\n' NEXT_SERVER_ACTIONS_ENCRYPTION_KEY "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-iSXPhZRT+rGUrCkGLCzc8pct7qUYmqP0HCMGZN7sYB0=}"
} > "$ENV_FILE"

echo "Wrote production $ENV_FILE from deploy secrets"
