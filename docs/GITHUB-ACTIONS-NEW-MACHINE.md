# Deploy to a New EC2 Machine — GitHub Actions Only

Use this flow when you want **all app deploys** to run from GitHub Actions (no manual `docker compose` on the server).

**Two workflows:**

| Workflow | When | What it does |
|----------|------|----------------|
| **Bootstrap EC2 (one-time)** | Once per new server | Installs Docker, clones `prod` branch |
| **Deploy to EC2** | Every push to `prod` (or manual) | Writes `.env` from secrets, builds & starts containers |

Nginx + SSL on the host are still one-time manual steps (see [EC2-DEPLOYMENT.md](./EC2-DEPLOYMENT.md) §5).

---

## Step 1 — Launch EC2 (AWS console)

| Setting | Value |
|---------|--------|
| OS | Amazon Linux 2023 |
| Type | t2.small recommended |
| Elastic IP | Attach to instance |
| Security group | **22** (your IP or `0.0.0.0/0` for GitHub SSH), **80**, **443** |

Nothing else to install on the server — bootstrap workflow handles Docker + git + clone.

---

## Step 2 — GitHub secrets

**Settings → Secrets and variables → Actions → New repository secret**

### SSH (required)

| Secret | Example |
|--------|---------|
| `EC2_HOST` | `54.123.45.67` or Elastic IP |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Full `.pem` file contents |
| `EC2_APP_DIR` | `~/charted_accountant_crm` (optional) |

### App config (required for deploy)

| Secret | Purpose |
|--------|---------|
| `POSTGRES_PASSWORD` | Self-hosted Postgres password |
| `ADMIN_EMAIL` | CA admin login email |
| `ADMIN_PASSWORD` | CA admin login password |
| `ADMIN_NAME` | Display name (optional; defaults to `Administrator`) |
| `APP_PUBLIC_URL` | `https://cafirmops.in` |

Add the same secrets under **Settings → Environments → production** if you use environment-scoped secrets.

---

## Step 3 — Bootstrap (one-time)

1. GitHub → **Actions**
2. **Bootstrap EC2 (one-time)** → **Run workflow**
3. Wait for green ✓

This installs Docker and clones `prod` to `~/charted_accountant_crm`.

---

## Step 4 — Deploy

1. GitHub → **Actions**
2. **Deploy to EC2** → **Run workflow** → branch `prod`
3. Wait for CI + deploy (first build may take 15–20 min on t2.micro)

Or push to `prod`:

```bash
git push origin prod
```

Deploy workflow will:

1. Run CI (build + lint)
2. SSH to EC2
3. Write `.env` from GitHub secrets
4. `git pull` + `docker compose build` + `docker compose up -d`
5. Create admin user on first boot (from `ADMIN_*` secrets)

---

## Step 5 — DNS + Nginx + HTTPS (one-time on EC2)

Point domain A records to the new Elastic IP, then on EC2:

```bash
sudo dnf install -y nginx certbot python3-certbot-nginx
# Proxy :80 → 127.0.0.1:3000 — see EC2-DEPLOYMENT.md
sudo certbot --nginx -d cafirmops.in -d www.cafirmops.in
```

Ensure `APP_PUBLIC_URL` secret is `https://cafirmops.in`, then re-run **Deploy to EC2**.

---

## Step 6 — Verify

```bash
# On EC2 after deploy
docker ps
docker logs charted_accountant_crm-backend-1 2>&1 | tail -10
```

Browser: https://cafirmops.in/login → `ADMIN_EMAIL` / `ADMIN_PASSWORD`

---

## Private repository

If the repo is private, EC2 needs a **deploy key** so `git fetch` works when Actions SSHs in. See [GITHUB_ACTIONS_SETUP.md](../.github/GITHUB_ACTIONS_SETUP.md) §3 Option B.

---

## Ongoing deploys

Merge to `prod` and push — Actions deploys automatically:

```bash
git checkout prod
git merge feature_1.0
git push origin prod
```

Manual deploy: **Actions → Deploy to EC2 → Run workflow**.
