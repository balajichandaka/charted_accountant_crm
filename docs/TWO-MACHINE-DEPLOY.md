# Two Machines — Two Branches

Run **`prod`** and **`feature_1.0`** on **separate EC2 instances**. GitHub Actions picks the target machine from the branch you push.

| Branch | GitHub environment | Machine | Database |
|--------|-------------------|---------|----------|
| `prod` | **production** | New EC2 | Self-hosted Postgres (Docker volume) |
| `feature_1.0` | **staging** | Old EC2 | Render Postgres (external) |

Each environment has its **own secrets** (different `EC2_HOST`, keys, etc.).

---

## 1. Create GitHub environments

**Settings → Environments**

### `production` (prod machine)

| Secret | Example |
|--------|---------|
| `EC2_HOST` | New Elastic IP |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | `.pem` for new machine |
| `POSTGRES_PASSWORD` | Self-hosted DB password |
| `ADMIN_EMAIL` | Admin login |
| `ADMIN_PASSWORD` | Admin password |
| `ADMIN_NAME` | Optional |
| `APP_PUBLIC_URL` | `https://cafirmops.in` (or new domain) |

### `staging` (feature_1.0 machine)

| Secret | Example |
|--------|---------|
| `EC2_HOST` | Old Elastic IP (`34.236.143.82`) |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | `.pem` for old machine |
| `APP_PUBLIC_URL` | Optional — `https://cafirmops.in` if same domain on old box |

Staging uses Render Postgres from `docker-compose.yml` on `feature_1.0` — no `POSTGRES_PASSWORD` needed unless you override.

---

## 2. Bootstrap each machine (once)

**Actions → Bootstrap EC2 → Run workflow**

| Run | Environment | Clones branch |
|-----|-------------|---------------|
| 1st | **production** | `prod` |
| 2nd | **staging** | `feature_1.0` |

---

## 3. Deploy

| Action | Result |
|--------|--------|
| `git push origin prod` | Deploys to **production** machine |
| `git push origin feature_1.0` | Deploys to **staging** machine |
| **Deploy to EC2** (manual) | Choose branch → matching environment |

---

## 4. Typical workflow

```bash
# Develop on feature branch
git checkout feature_1.0
# ... changes ...
git push origin feature_1.0
# → deploys to OLD machine (staging)

# Promote to production
git checkout prod
git merge feature_1.0
git push origin prod
# → deploys to NEW machine (production)
```

---

## 5. DNS note

If both machines use **cafirmops.in**, only one can serve that domain at a time. Common setups:

- **prod** → `cafirmops.in` (production)
- **feature_1.0** → old IP or a subdomain like `staging.cafirmops.in`

Point DNS A record to the machine you want live for each hostname.

---

## 6. Security group

Both machines need **22** (SSH from GitHub Actions), **80**, **443**.

Each machine's `EC2_HOST` secret must match its Elastic IP.

See also: [GITHUB-ACTIONS-NEW-MACHINE.md](./GITHUB-ACTIONS-NEW-MACHINE.md)

---

## Troubleshooting: prod and staging deploy to the same machine

The workflow picks the machine from **GitHub environment secrets**, not from the branch name alone. If both deploys hit the same box, `EC2_HOST` is the same (or only set once at **repository** level).

**Fix:**

1. **Settings → Environments** — create two environments named exactly **`production`** and **`staging`** (not `prod`).
2. Set **different** `EC2_HOST` in each:

   | Environment | `EC2_HOST` |
   |-------------|------------|
   | **staging** | Old machine, e.g. `34.236.143.82` |
   | **production** | New machine, e.g. `50.17.16.46` |

3. Each environment also needs its own `EC2_USER` and `EC2_SSH_KEY` (`.pem` for that instance).
4. **Remove** `EC2_HOST`, `EC2_USER`, and `EC2_SSH_KEY` from **Repository secrets** if they exist — otherwise it is easy to think both envs are configured when only the repo secret is used.

After the next deploy, check the Actions log for:

```text
==> This EC2 instance public IP:
50.17.16.46
```

- **Deploy (feature_1.0)** should show the **old** IP.
- **Deploy (prod)** should show **50.17.16.46**.
