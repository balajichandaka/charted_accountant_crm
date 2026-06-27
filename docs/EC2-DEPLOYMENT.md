# EC2 Deployment Guide — cafirmops.in

This document records how the CA Practice CRM was deployed on AWS EC2 with Docker, a custom domain, and HTTPS.

**Live site:** https://cafirmops.in

---

## Architecture

```
Browser
  → https://cafirmops.in:443
  → Nginx (SSL termination on EC2 host)
  → http://127.0.0.1:3000
  → Docker frontend (Next.js)
  → Docker backend (Express) at http://backend:4000
  → Docker PostgreSQL (self-hosted, volume `pgdata` on EC2 disk)
```

| Component | Where it runs | Port |
|-----------|---------------|------|
| Nginx | EC2 host | 80, 443 |
| Frontend (Next.js) | Docker | 3000 (host) → 3000 (container) |
| Backend (Express) | Docker | 4000 (optional public; internal via Docker network) |
| Database | Docker Postgres (`pgdata` volume) | internal only (not exposed on host) |

Nginx handles HTTPS. Docker serves the app on port **3000** so Nginx can use **80** and **443**.

---

## 1. AWS EC2 setup

### Instance

- **OS:** Amazon Linux 2023
- **User:** `ec2-user`
- **Instance type:** t2.micro (first build can take 10–20 minutes)
- **Public IP:** `34.236.143.82` (use Elastic IP in production so the IP does not change on restart)

### Security group (inbound rules)

| Type  | Port | Source    | Purpose        |
|-------|------|-----------|----------------|
| SSH   | 22   | Your IP   | SSH access     |
| HTTP  | 80   | 0.0.0.0/0 | HTTP → HTTPS   |
| HTTPS | 443  | 0.0.0.0/0 | Public website |

Port **3000** does not need to be public when Nginx is in front.

### SSH access

```bash
ssh -i your-key.pem ec2-user@34.236.143.82
```

---

## 2. One-time server bootstrap

### Install Docker, Compose, and clone the repo

On a fresh EC2 instance:

```bash
REPO_URL=https://github.com/YOUR_ORG/charted_accountant_crm.git \
  ./scripts/ec2-bootstrap.sh
```

The bootstrap script:

1. Installs Docker and Git (Amazon Linux 2023 via `dnf`)
2. Installs standalone `docker-compose` v5.1.4 (plugin not in AL2023 repos)
3. Installs `docker-buildx` v0.34.1 (required by Compose v5)
4. Clones the repo to `~/charted_accountant_crm`
5. Adds the current user to the `docker` group

After bootstrap:

```bash
newgrp docker   # or log out and back in
cd ~/charted_accountant_crm
```

### Amazon Linux note

Use `docker-compose` (hyphen), not `docker compose`:

```bash
./scripts/compose.sh up --build -d
```

`scripts/compose.sh` tries the plugin first, then falls back to standalone `docker-compose`.

---

## 3. Application configuration (`docker-compose.yml`)

All production env vars live in `docker-compose.yml` and an optional repo-root `.env` file.

### Self-hosted PostgreSQL

The `prod` branch runs Postgres in Docker on the EC2 instance. Data persists in the **`pgdata`** volume on the instance disk. Postgres is **not** exposed on the host (no public port 5432).

Before first deploy:

```bash
cd ~/charted_accountant_crm
cp .env.example .env
nano .env   # set POSTGRES_PASSWORD and APP_PUBLIC_URL
```

### Key settings

| Variable | Production value | Purpose |
|----------|------------------|---------|
| `APP_PUBLIC_URL` | `https://cafirmops.in` | Public URL for auth redirects, CORS, emails |
| `APP_PORT` | `3000` | Host port mapped to frontend container |
| `BACKEND_URL` | `http://backend:4000` | Frontend → backend (Docker internal network) |
| `AUTH_TRUST_HOST` | `true` | Required for Auth.js behind Nginx/HTTPS |
| `POSTGRES_PASSWORD` | strong secret in `.env` | Self-hosted Postgres password |
| `DATABASE_URL` | `postgresql://ca:PASSWORD@db:5432/ca_app?schema=public` | Auto-built from `.env` in compose |

### Start the app

```bash
cd ~/charted_accountant_crm
git checkout prod
cp .env.example .env   # first time only
./scripts/compose.sh up --build -d
```

First build on t2.micro is slow. Add swap if the instance runs out of memory during build.

### Verify containers

```bash
docker ps
docker logs charted_accountant_crm-backend-1
docker logs charted_accountant_crm-frontend-1
```

Expected:

- Frontend: `0.0.0.0:3000->3000/tcp`
- Backend: healthy, `[backend] Running on http://localhost:4000`
- Frontend: `Ready in ...ms`

### Local test on EC2

```bash
curl -I http://127.0.0.1:3000
# HTTP/1.1 307 → https://cafirmops.in/login
```

---

## 4. Domain DNS (GoDaddy — cafirmops.in)

### DNS records

In GoDaddy → **DNS** → **DNS Records**:

| Type | Name | Data | TTL |
|------|------|------|-----|
| A | `@` | `34.236.143.82` | 600 |
| A | `www` | `34.236.143.82` | 600 |

Leave NS/SOA records as GoDaddy defaults.

### Disable GoDaddy parking / forwarding

- **Forwarding** tab: remove all forwarding rules
- **Products** tab: disable Website Builder / Coming Soon
- Do not use “Connect Domain” / Airo to attach a GoDaddy site

### Verify DNS (from your laptop)

```bash
dig cafirmops.in +short
# Should eventually show only: 34.236.143.82
```

Old GoDaddy parking IPs (`13.248.x`, `76.223.x`) may linger in DNS cache for up to 24 hours after the change.

---

## 5. HTTPS with Nginx + Let’s Encrypt

Nginx runs on the **EC2 host** (not in Docker). It terminates SSL and proxies to the frontend on port 3000.

### Install Nginx and Certbot

```bash
sudo dnf install -y nginx
sudo dnf install -y certbot python3-certbot-nginx \
  || sudo pip3 install certbot certbot-nginx

sudo systemctl enable nginx
```

### Initial Nginx config (HTTP proxy)

Before SSL, proxy HTTP to the app:

```bash
sudo tee /etc/nginx/conf.d/cafirmops.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name cafirmops.in www.cafirmops.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl start nginx
```

Test:

```bash
curl -I http://cafirmops.in
```

### Obtain SSL certificate

```bash
sudo certbot --nginx -d cafirmops.in -d www.cafirmops.in
```

- Enter email for renewal notices
- Agree to terms
- Choose **redirect HTTP to HTTPS** (recommended)

Certbot updates `/etc/nginx/conf.d/cafirmops.conf` with SSL paths and HTTP→HTTPS redirect.

### Final Nginx config (after Certbot)

Certbot-managed config looks like:

```nginx
server {
    server_name cafirmops.in www.cafirmops.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/cafirmops.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cafirmops.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.cafirmops.in) {
        return 301 https://$host$request_uri;
    }
    if ($host = cafirmops.in) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name cafirmops.in www.cafirmops.in;
    return 404;
}
```

### Restart app with HTTPS URL

```bash
cd ~/charted_accountant_crm
./scripts/compose.sh up -d --force-recreate
```

Defaults in `docker-compose.yml` already set `APP_PUBLIC_URL` to `https://cafirmops.in`.

### Verify HTTPS

On EC2:

```bash
curl -Ik https://cafirmops.in
# Server: nginx/1.30.2
# HTTP/1.1 307 → /login
```

From laptop:

```bash
curl -Ik https://cafirmops.in
dig cafirmops.in +short
```

Browser: https://cafirmops.in

### Certificate renewal

Certbot installs a systemd timer. Test renewal:

```bash
sudo certbot renew --dry-run
```

---

## 6. Deploying new changes

### Option A — GitHub Actions (automatic)

Triggers on push to **`main`** or **`feature_1.0`** (see `.github/workflows/deploy.yml`).

Full setup guide: [`.github/GITHUB_ACTIONS_SETUP.md`](../.github/GITHUB_ACTIONS_SETUP.md)

**GitHub Secrets required:**

| Secret | Value |
|--------|-------|
| `EC2_HOST` | `34.236.143.82` |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | PEM private key contents |
| `EC2_APP_DIR` | Optional: `~/charted_accountant_crm` |

**Workflow:**

```bash
git checkout main
git merge feature_1.0
git push origin main
```

GitHub Actions runs CI, then SSHs to EC2 and runs `scripts/deploy-ec2.sh`.

Monitor: GitHub → **Actions** tab.

Manual trigger: **Actions** → **Deploy to EC2** → **Run workflow**.

### Option B — Manual deploy on EC2

```bash
ssh -i your-key.pem ec2-user@34.236.143.82

cd ~/charted_accountant_crm
git pull origin main
./scripts/deploy-ec2.sh
```

`deploy-ec2.sh` does:

1. `git fetch` + `git reset --hard origin/main`
2. `docker-compose build`
3. `docker-compose up -d`
4. `docker image prune -f`

### What is NOT redeployed by git pull

These live on the EC2 host and persist across app deploys:

- `/etc/nginx/conf.d/cafirmops.conf`
- `/etc/letsencrypt/` (SSL certificates)
- AWS security group rules

---

## 7. Troubleshooting

### Site not loading in browser

```bash
# On EC2
curl -I http://127.0.0.1:3000          # App up?
sudo ss -tlnp | grep -E ':80|:443|:3000'  # Ports listening?
sudo systemctl status nginx             # Nginx running?
curl -s http://checkip.amazonaws.com    # EC2 public IP
```

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| IP works, domain does not | DNS not pointing to EC2 | Update GoDaddy A records |
| GoDaddy parking page (`Server: DPS/2.0.0`) | Old DNS / forwarding / parking | Remove forwarding; wait for propagation |
| `http://domain` fails, `:3000` works | Nginx not running | Start Nginx; check config |
| Login redirects to wrong URL | `APP_PUBLIC_URL` wrong | Set to `https://cafirmops.in` and recreate containers |
| Build fails / OOM on t2.micro | Low memory | Add swap; wait longer |

### View logs

```bash
docker logs -f charted_accountant_crm-backend-1
docker logs -f charted_accountant_crm-frontend-1
sudo tail -f /var/log/nginx/error.log
```

### Prisma warnings in backend logs

These are informational, not errors:

- `package.json#prisma` deprecation → future Prisma 7 change
- `Update available 6.19.3 -> 7.8.0` → optional upgrade
- `No pending migrations to apply` → database is up to date

---

## 8. Demo login

| Field | Value |
|-------|-------|
| Email | `ca@firm.test` |
| Password | `password123` |

---

## 9. File reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | All service env vars and port mappings |
| `scripts/ec2-bootstrap.sh` | One-time EC2 Docker + repo setup |
| `scripts/compose.sh` | `docker compose` / `docker-compose` wrapper |
| `scripts/deploy-ec2.sh` | Pull, build, restart on deploy |
| `scripts/install-buildx.sh` | Install buildx for Compose v5 |
| `.github/workflows/ci.yml` | PR/push CI checks |
| `.github/workflows/deploy.yml` | Auto-deploy to EC2 on push to `main` |

---

## 10. Quick command cheat sheet

```bash
# EC2 public IP
curl -s http://checkip.amazonaws.com

# Start / restart app
cd ~/charted_accountant_crm
./scripts/compose.sh up --build -d

# Force recreate after env change
./scripts/compose.sh up -d --force-recreate

# Deploy latest main
./scripts/deploy-ec2.sh

# Check HTTPS end-to-end
curl -Ik https://cafirmops.in

# Nginx
sudo nginx -t
sudo systemctl reload nginx

# SSL renewal test
sudo certbot renew --dry-run
```
