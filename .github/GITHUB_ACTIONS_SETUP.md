# GitHub Actions — EC2 Deploy Setup

Automated deploy: push to `prod` or `feature_1.0` → CI → SSH to the matching EC2 environment → rebuild containers.

**Two machines?** See [docs/TWO-MACHINE-DEPLOY.md](../docs/TWO-MACHINE-DEPLOY.md) — `prod` → **production** env, `feature_1.0` → **staging** env.

**New server?** See [docs/GITHUB-ACTIONS-NEW-MACHINE.md](../docs/GITHUB-ACTIONS-NEW-MACHINE.md).

Workflow files:

- `.github/workflows/ci.yml` — build + lint
- `.github/workflows/bootstrap-ec2.yml` — **one-time** Docker + clone on new EC2
- `.github/workflows/deploy.yml` — deploy after CI passes

---

## 1. GitHub repository secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

### SSH

| Secret | Value | Example |
|--------|-------|---------|
| `EC2_HOST` | EC2 public IP or domain | `34.236.143.82` |
| `EC2_USER` | SSH user | `ec2-user` |
| `EC2_SSH_KEY` | Full contents of your `.pem` private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `EC2_APP_DIR` | Optional app path on EC2 | `~/charted_accountant_crm` |

### Application (written to `.env` on each deploy)

| Secret | Value | Example |
|--------|-------|---------|
| `POSTGRES_PASSWORD` | Postgres password | strong random string |
| `ADMIN_EMAIL` | CA admin login | `admin@cafirmops.in` |
| `ADMIN_PASSWORD` | CA admin password | strong password |
| `ADMIN_NAME` | Optional display name | `Sai Charan` |
| `APP_PUBLIC_URL` | Public site URL | `https://cafirmops.in` |

To copy the PEM key:

```bash
cat your-key.pem
```

Paste the entire file including `BEGIN` and `END` lines.

---

## 2. GitHub environments (required for two machines)

Create two environments under **Settings → Environments**:

| Environment | Branch | Machine |
|-------------|--------|---------|
| `production` | `prod` | New EC2 (self-hosted Postgres) |
| `staging` | `feature_1.0` | Old EC2 (Render Postgres) |

Add the secrets from §1 to **each environment** with that machine's `EC2_HOST` and key. Production also needs `POSTGRES_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

Optional: enable **Required reviewers** on `production` only.

---

## 4. EC2 must pull code from GitHub

GitHub Actions SSHs into EC2 and runs `git fetch` + `git reset --hard origin/<branch>`.

### Option A — Public repository

No extra setup. Ensure the remote is correct on EC2:

```bash
cd ~/charted_accountant_crm
git remote -v
git fetch origin prod
```

### Option B — Private repository (deploy key)

On EC2:

```bash
ssh-keygen -t ed25519 -C "ec2-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

1. GitHub repo → **Settings → Deploy keys → Add deploy key**
2. Title: `EC2 deploy`
3. Paste the public key
4. Read-only access is enough

On EC2, configure SSH for GitHub:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/github_deploy

cd ~/charted_accountant_crm
git remote set-url origin git@github.com:balajichandaka/charted_accountant_crm.git
git fetch origin
```

Test:

```bash
git fetch origin prod
```

---

## 4. New machine checklist (GitHub Actions only)

1. Launch EC2 + Elastic IP + security group (22, 80, 443)
2. Add all secrets from §1
3. Run **Bootstrap EC2 (one-time)** workflow
4. Run **Deploy to EC2** workflow (or push to `prod`)
5. Configure DNS + Nginx + SSL on EC2 (manual, one-time)

Nginx and SSL are **not** managed by GitHub Actions — only Docker containers are rebuilt on deploy.

---

## 5. How deploy is triggered

| Trigger | Branch | Target environment |
|---------|--------|-------------------|
| Push to `prod` | `prod` | **production** (new machine) |
| Push to `feature_1.0` | `feature_1.0` | **staging** (old machine) |
| Manual: **Bootstrap EC2** | — | Choose production or staging |
| Manual: **Deploy to EC2** | chosen branch | matching environment |

Monitor: **GitHub → Actions** tab.

---

## 6. Typical developer workflow

```bash
# Merge tested changes into prod and deploy to EC2
git checkout prod
git merge feature_1.0
git push origin prod
# → CI + deploy run automatically (self-hosted Postgres on EC2)
```

---

## 7. Troubleshooting

| Failure | Fix |
|---------|-----|
| `ssh: handshake failed` | Check `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`; security group port 22 |
| `git fetch` fails on EC2 | Set up deploy key (private repo) or fix `git remote` |
| `docker-compose: command not found` | Run `scripts/ec2-bootstrap.sh` or install compose on EC2 |
| CI fails on frontend lint | Fix lint locally: `cd frontend && npm run lint` |
| Deploy skipped | CI must pass first; check CI job logs |
| Wrong branch on EC2 | Push to the branch you want; or use manual workflow dispatch |

---

## 8. Verify after deploy

On EC2:

```bash
docker ps
curl -Ik https://cafirmops.in
```

Browser: https://cafirmops.in
