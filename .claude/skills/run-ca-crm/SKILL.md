---
name: run-ca-crm
description: Launch, seed, and drive the CA Practice Management CRM locally (Next.js frontend + Express/Prisma backend + Postgres), including multi-tenant firm provisioning. Use when asked to run/start/deploy the app locally, test it, reset the local DB, seed demo data, onboard/provision a firm, or reproduce the two-firm isolation check.
---

# Run the CA Practice CRM locally

This is a **multi-tenant SaaS**: one shared Postgres DB, every table scoped by `firmId`,
firm resolved from the subdomain (`<slug>.cafirmops.in`, or `<slug>.localhost` in dev).
Architecture: `backend/` = Express + Prisma (owns the DB), `frontend/` = Next.js 16 BFF
that calls the backend over HTTP with a bearer JWT.

See `docs/superpowers/specs` and the plan for design; for tenancy internals read
`backend/src/lib/prisma.ts` + `backend/src/lib/tenant-context.ts`.

## ⚠️ Never run migrations/seed against production

`backend/.env` contains a **live Render production `DATABASE_URL`**. Do **not** run
`prisma migrate`/`db seed` with that env. Always export a LOCAL `DATABASE_URL` first
(Prisma does not override an already-set shell var, so an inline export wins).

## 1. Start a local Postgres (isolated from prod)

```bash
docker rm -f ca_local_pg 2>/dev/null
docker run -d --name ca_local_pg \
  -e POSTGRES_USER=ca -e POSTGRES_PASSWORD=ca_password -e POSTGRES_DB=ca_app \
  -p 5433:5432 postgres:16
sleep 4 && docker exec ca_local_pg pg_isready -U ca
```

Local DB URL (used everywhere below):
`postgresql://ca:ca_password@localhost:5433/ca_app?schema=public`

## 2. Migrate + seed the demo firm

```bash
cd backend
export DATABASE_URL="postgresql://ca:ca_password@localhost:5433/ca_app?schema=public"
npx prisma migrate deploy          # applies all migrations incl. multi_tenant_firms
SEED_FIRM_SLUG=demo npx prisma db seed   # creates firm slug "demo" + demo data
```

Seed creates firm **demo** with: CA `ca@firm.test` / `password123` (also
`priya@`, `rahul@`, `meena@firm.test`, same password), 10 categories, 3 clients,
sample tickets.

## 3. Start the backend (port 4000)

Requires `JWT_SECRET` (app refuses to start without it) and `PLATFORM_SECRET`
(for firm provisioning). Run in the background.

```bash
cd backend
export DATABASE_URL="postgresql://ca:ca_password@localhost:5433/ca_app?schema=public"
export JWT_SECRET="local-dev-jwt-secret"
export CRON_SECRET="local-cron-secret"
export PLATFORM_SECRET="local-platform-secret"
export FRONTEND_URL="http://localhost:3001,http://localhost:3000"
export APP_URL="http://localhost:3001"
export PORT=4000 NODE_ENV=development
npm run dev            # tsx watch; smoke: curl -s localhost:4000/health -> {"ok":true}
```

## 4. Start the frontend (port 3001)

`NEXT_PUBLIC_DEFAULT_FIRM_SLUG` makes plain `localhost` resolve to a firm (dev only;
in prod the bare domain is marketing). Run in the background.

```bash
cd frontend
export BACKEND_URL="http://localhost:4000"
export AUTH_SECRET="local-dev-auth-secret"
export AUTH_TRUST_HOST=true
export NEXT_PUBLIC_DEFAULT_FIRM_SLUG=demo
export NEXT_PUBLIC_ROOT_DOMAIN=cafirmops.in
export PORT=3001
npm run dev            # Next 16 + turbopack, hot-reloads on edits
```

Open **http://localhost:3001** → log in `ca@firm.test` / `password123` (demo firm).

## 5. Provision a second firm (test isolation)

```bash
cd backend
export DATABASE_URL="postgresql://ca:ca_password@localhost:5433/ca_app?schema=public"
export JWT_SECRET="local-dev-jwt-secret"   # provision lib imports prisma -> needs it
npm run create-firm -- --name "Beta Advisors" --slug beta \
  --ca-name "Beta CA" --ca-email admin@beta.test --ca-password "password123"
```

Then open **http://beta.localhost:3001** (browsers resolve `*.localhost` to 127.0.0.1)
and log in `admin@beta.test` / `password123`. Beta sees none of demo's data.

## 5b. Onboard clients (Platform Admin console)

Full runbook: `docs/ONBOARDING.md`. Quick version:

```bash
cd backend
export DATABASE_URL="postgresql://ca:ca_password@localhost:5433/ca_app?schema=public"
export JWT_SECRET="local-dev-jwt-secret"
# one-time: create a super-admin, then log in at http://localhost:3001/platform/login
npm run create-platform-admin -- --name "Platform Admin" --email admin@cafirmops.in --password "password123"
```

The console at `/platform` (prod: `admin.cafirmops.in`) lists firms and has an **Onboard new firm**
form + an Active toggle to suspend/re-activate. It's separate from firm login (own cookie auth) and
excluded from the firm-auth proxy matcher. CLI `npm run create-firm` still works headless.

## 6. Drive / verify without a browser

Full login over HTTP (exercises frontend → backend → session), then load a page:

```bash
J=/tmp/ca_cookies.txt; F=http://localhost:3001
CSRF=$(curl -s -c $J "$F/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -b $J -c $J -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  -X POST "$F/api/auth/callback/credentials" -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" --data-urlencode "email=ca@firm.test" \
  --data-urlencode "password=password123" --data-urlencode "firmSlug=demo" \
  --data-urlencode "callbackUrl=$F/dashboard"        # -> 302 http://localhost:3001/dashboard
curl -s -b $J "$F/dashboard" | grep -o "Acme Traders"   # demo data renders
```

Backend API directly: `POST /api/auth/login {email,password,firmSlug}` → `{data.token}`,
then `Authorization: Bearer <token>` against `/api/clients`, `/api/tickets`, `/api/firm`, etc.

## 7. Build / lint checks (CI parity)

```bash
cd backend  && npm run build          # tsc, must be 0 errors
cd frontend && npm run build && npm run lint   # 0 errors (a few pre-existing warnings ok)
```

## Reset / teardown

```bash
# fresh DB: recreate the container (step 1) then re-run step 2
docker rm -f ca_local_pg              # stop + remove local Postgres
pkill -f "tsx watch src/index.ts"     # stop backend
# stop the frontend via its background task / Ctrl-C
```

## Notes & gotchas

- **Firm slug resolution** (`frontend/src/lib/tenant.ts`): `<slug>.localhost` → slug;
  plain `localhost` → `NEXT_PUBLIC_DEFAULT_FIRM_SLUG`; reserved `www/app/admin/api` → null.
- **Tenant isolation** is auto-enforced by a Prisma `$extends` hook keyed off an
  AsyncLocalStorage `firmId` set in `authMiddleware`. The scoped `prisma` client throws
  if used with no firm context; use `basePrisma` for cross-firm/system work.
- **Ports**: if 3000 is taken by another dev server, the frontend here uses 3001. Backend 4000, Postgres 5433 (host).
- This is **not** vanilla Next.js — check `node_modules/next/dist/docs/` before writing frontend code (per AGENTS.md). Middleware is `frontend/src/proxy.ts` (the `proxy` convention).
