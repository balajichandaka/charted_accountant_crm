#!/usr/bin/env bash
# One-time EC2 setup. Supports Amazon Linux 2023/2 and Ubuntu.
set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-$HOME/charted_accountant_crm}"
PUBLIC_HOST="${PUBLIC_HOST:-}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-prod}"

install_buildx() {
  echo "==> Installing docker buildx (required by docker-compose v5+)"
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64) BUILDX_ARCH=amd64 ;;
    aarch64) BUILDX_ARCH=arm64 ;;
    *) echo "Unsupported arch: $ARCH"; exit 1 ;;
  esac
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -fsSL "https://github.com/docker/buildx/releases/download/v0.34.1/buildx-v0.34.1.linux-${BUILDX_ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-buildx
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
}

install_compose_binary() {
  echo "==> Installing standalone docker-compose"
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64) ARCH=x86_64 ;;
    aarch64) ARCH=aarch64 ;;
    *) echo "Unsupported arch: $ARCH"; exit 1 ;;
  esac
  sudo curl -fsSL "https://github.com/docker/compose/releases/download/v5.1.4/docker-compose-linux-${ARCH}" \
    -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  install_buildx
}

install_docker() {
  if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
  fi

  case "${ID:-}" in
    amzn)
      echo "==> Installing Docker (Amazon Linux)"
      if command -v dnf >/dev/null 2>&1; then
        sudo dnf update -y
        sudo dnf install -y docker git
        sudo dnf install -y docker-compose-plugin || install_compose_binary
      else
        sudo yum update -y
        sudo yum install -y docker git
        install_compose_binary
      fi
      sudo systemctl enable docker
      sudo systemctl start docker
      ;;
    ubuntu | debian)
      echo "==> Installing Docker (Ubuntu/Debian)"
      sudo apt-get update
      sudo apt-get install -y docker.io docker-compose-v2 git
      ;;
    *)
      echo "Unsupported OS: ${ID:-unknown}. Install Docker manually, then re-run."
      exit 1
      ;;
  esac

  sudo usermod -aG docker "$USER"
}

if [ -z "$REPO_URL" ]; then
  echo "Usage: REPO_URL=https://github.com/you/charted_accountant_crm.git ./scripts/ec2-bootstrap.sh"
  exit 1
fi

install_docker

echo "==> Cloning repository"
if [ -d "$APP_DIR/.git" ]; then
  echo "Repo already exists at $APP_DIR"
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
chmod +x scripts/deploy-ec2.sh scripts/compose.sh scripts/install-buildx.sh

echo ""
echo "Bootstrap done. Next steps:"
echo "  1. Log out and back in (docker group), or run: newgrp docker"
echo "  2. Get public IP: curl -s http://checkip.amazonaws.com"
echo "  3. Configure env:"
echo "       cd $APP_DIR && cp .env.example .env && nano .env"
echo "     Set POSTGRES_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, APP_PUBLIC_URL"
echo "  4. Start app (branch: $DEPLOY_BRANCH):"
echo "       ./scripts/compose.sh up --build -d"
echo "  5. Open security group ports 80, 443 (and 22 for SSH); point DNS to this host"
echo "  6. Nginx + SSL — see docs/NEW-MACHINE-DEPLOY.md"
echo "  7. GitHub Actions: update EC2_HOST secret to this machine's IP"
