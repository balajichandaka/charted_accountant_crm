# GitHub Actions — EC2 Deploy Setup

Automated deploy: push to `prod` → CI runs → SSH to EC2 → pull code → rebuild Docker containers.

The `prod` branch uses **self-hosted PostgreSQL** on EC2 (Docker volume). The `feature_1.0` branch uses external Render Postgres.

Workflow files:

- `.github/workflows/ci.yml` — build + lint
- `.github/workflows/deploy.yml` — deploy after CI passes

---

## 1. GitHub repository secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value | Example |
|--------|-------|---------|
| `EC2_HOST` | EC2 public IP or domain | `34.236.143.82` |
| `EC2_USER` | SSH user | `ec2-user` |
| `EC2_SSH_KEY` | Full contents of your `.pem` private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `EC2_APP_DIR` | Optional app path on EC2 | `~/charted_accountant_crm` |

To copy the PEM key:

```bash
cat your-key.pem
```

Paste the entire file including `BEGIN` and `END` lines.

---

## 2. GitHub environment (optional)

`deploy.yml` uses the `production` environment. On first run, GitHub may prompt you to create it.

**Settings → Environments → production**

- Add the same secrets there if you use environment-scoped secrets
- Optionally enable **Required reviewers** for manual approval before deploy

---

## 3. EC2 must pull code from GitHub

GitHub Actions SSHs into EC2 and runs `git fetch` + `git reset --hard origin/<branch>`.
The EC2 instance needs read access to the repo.

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

## 4. EC2 one-time checklist

```bash
# Docker works
docker ps

# Repo exists
ls ~/charted_accountant_crm/scripts/deploy-ec2.sh

# Manual deploy test
cd ~/charted_accountant_crm
DEPLOY_BRANCH=prod ./scripts/deploy-ec2.sh
```

Nginx and SSL are **not** managed by GitHub Actions — they stay on the host. Only Docker containers are rebuilt.

---

## 5. How deploy is triggered

| Trigger | Branch deployed |
|---------|-----------------|
| Push to `prod` | `prod` |
| Manual: Actions → Deploy to EC2 → Run workflow | Choose branch |

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
