# Deploy to a New EC2 Machine (prod branch)

Step-by-step for a **fresh server** with self-hosted Postgres and a single admin user.

**Branch:** `prod`  
**Stack:** Docker Compose (`db` + `backend` + `frontend`) + Nginx + Let's Encrypt

---

## Before you start (on your laptop)

1. Push the `prod` branch to GitHub (if not already):

```bash
git push -u origin prod
```

2. Have ready:
   - EC2 `.pem` key
   - Domain name (e.g. `cafirmops.in`) or use the EC2 public IP for testing
   - Admin login email + password for the app
   - Strong Postgres password

---

## Step 1 — Launch EC2

| Setting | Value |
|---------|--------|
| OS | Amazon Linux 2023 |
| Type | t2.small recommended (t2.micro works; first build is slow) |
| Storage | 20 GB+ |
| Elastic IP | Attach one so the IP does not change on reboot |

**Security group inbound:**

| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP | SSH |
| 80 | 0.0.0.0/0 | HTTP (Certbot + redirect) |
| 443 | 0.0.0.0/0 | HTTPS |

Do **not** open 5432 (Postgres stays inside Docker).

SSH in:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

---

## Step 2 — Bootstrap Docker + clone repo

On the **new machine**:

```bash
curl -fsSL https://raw.githubusercontent.com/balajichandaka/charted_accountant_crm/prod/scripts/ec2-bootstrap.sh -o /tmp/ec2-bootstrap.sh
chmod +x /tmp/ec2-bootstrap.sh
REPO_URL=https://github.com/balajichandaka/charted_accountant_crm.git \
  DEPLOY_BRANCH=prod \
  /tmp/ec2-bootstrap.sh
```

Or if you already cloned manually:

```bash
cd ~
git clone https://github.com/balajichandaka/charted_accountant_crm.git
cd charted_accountant_crm
git checkout prod
chmod +x scripts/*.sh
```

Then refresh Docker group membership:

```bash
newgrp docker
```

---

## Step 3 — Configure environment

```bash
cd ~/charted_accountant_crm
cp .env.example .env
nano .env
```

Set at minimum:

```env
POSTGRES_PASSWORD=<strong-random-password>
ADMIN_NAME=Sai Charan
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=<strong-admin-password>
APP_PUBLIC_URL=https://cafirmops.in
```

Use `http://YOUR_EC2_IP` for `APP_PUBLIC_URL` only while testing before DNS/SSL.

Optional: add swap on small instances before the first build:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Step 4 — Start the app

```bash
cd ~/charted_accountant_crm
./scripts/compose.sh up --build -d
```

First build can take 10–20 minutes on t2.micro.

Verify:

```bash
docker ps
docker logs charted_accountant_crm-backend-1 2>&1 | tail -20
docker logs charted_accountant_crm-db-1 2>&1 | tail -5
curl -I http://127.0.0.1:3000
```

Backend log should show: `✓ Admin user created: your-admin@email.com`

Sign in locally on the server:

```bash
curl -I http://127.0.0.1:3000/login
```

---

## Step 5 — DNS (point domain to new machine)

In your DNS provider (GoDaddy, etc.):

| Type | Name | Value |
|------|------|-------|
| A | `@` | YOUR_EC2_IP |
| A | `www` | YOUR_EC2_IP |

Wait for propagation:

```bash
dig cafirmops.in +short
```

---

## Step 6 — Nginx + HTTPS

On EC2:

```bash
sudo dnf install -y nginx
sudo dnf install -y certbot python3-certbot-nginx \
  || sudo pip3 install certbot certbot-nginx
sudo systemctl enable nginx
```

Create Nginx config (replace domain):

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

Obtain SSL:

```bash
sudo certbot --nginx -d cafirmops.in -d www.cafirmops.in
```

Restart app so auth URLs use HTTPS:

```bash
cd ~/charted_accountant_crm
# Ensure .env has APP_PUBLIC_URL=https://cafirmops.in
./scripts/compose.sh up -d
```

Open https://cafirmops.in/login and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## Step 7 — GitHub Actions (optional auto-deploy)

Update GitHub **Settings → Secrets → Actions**:

| Secret | New value |
|--------|-----------|
| `EC2_HOST` | New EC2 IP or domain |
| `EC2_SSH_KEY` | Same or new `.pem` contents |
| `EC2_USER` | `ec2-user` |

Future pushes to `prod` will deploy automatically.

Manual deploy on the server:

```bash
cd ~/charted_accountant_crm
DEPLOY_BRANCH=prod ./scripts/deploy-ec2.sh
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build runs out of memory | Add swap (Step 3), use t2.small |
| Cannot log in | Check backend logs for admin bootstrap; verify `ADMIN_*` in `.env` |
| Redirect loop | Clear browser cookies; visit `/login?reauth=1` |
| Old machine data needed | Export from old Postgres (`pg_dump`) and restore into new `db` container |

Full reference: [EC2-DEPLOYMENT.md](./EC2-DEPLOYMENT.md)
