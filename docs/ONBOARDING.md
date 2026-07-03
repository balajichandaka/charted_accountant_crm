# Onboarding a new client (firm)

This app is multi-tenant: every firm's data is isolated by `firmId` and each firm has its own
subdomain `<slug>.cafirmops.in`. **Onboarding a client is a single database insert on the running
app** — no migration, no redeploy, no downtime, and it never touches any existing firm's data.

There are two ways to onboard: the **Platform Admin console** (recommended, point-and-click) or the
**CLI** (server shell). Both create exactly one `Firm` + one first `CA` user.

---

## One-time setup

### 1. Create the first platform (super-admin) account

Platform admins are separate from firm users; they run the console. Create the first one on the
server (in `backend/`, with the production `DATABASE_URL` in the env):

```bash
npm run create-platform-admin -- \
  --name "Platform Admin" --email admin@cafirmops.in --password "<strong-password>"
```

### 2. Set the platform secret (deploy env)

Set `PLATFORM_JWT_SECRET` in the backend environment (falls back to `JWT_SECRET` if unset, but a
dedicated secret is recommended).

The console lives at **`admin.cafirmops.in`** (or `https://<host>/platform`). It is separate from the
firm app and uses its own login.

---

## Data to collect from the client (intake)

| Field | Notes |
|---|---|
| **Firm name** | Display name, e.g. "Sharma & Co Chartered Accountants". |
| **Subdomain slug** | You assign & confirm. Lowercase letters/digits/hyphens, 2–40 chars, not `www`/`app`/`admin`/`api`, globally unique. Becomes `<slug>.cafirmops.in`. |
| **First CA — name** | The firm's owner/admin. |
| **First CA — email** | Their login email. |
| **Temporary password** | ≥ 8 chars; the CA changes it after first login. (The console can generate one.) |
| Branding/contact (optional) | Brand name, logo URL, contact + escalation email/phone. The CA can set these later in **Settings**. |

---

## Onboard (recommended: the console)

1. Go to **`admin.cafirmops.in`** (or `/platform`) and sign in as a platform admin.
2. Click **Onboard new firm**.
3. Enter the firm name, slug, and the first CA's name / email / temporary password (use **Generate**
   for the password). Submit.
4. The firm is **live immediately** at `<slug>.cafirmops.in`. It appears in the firms table with its
   usage counts and an **Active** toggle.

### Onboard via CLI (alternative)

```bash
# in backend/, with production DATABASE_URL set
npm run create-firm -- \
  --name "Sharma & Co" --slug sharmaco \
  --ca-name "Anita Sharma" --ca-email anita@sharmaco.com --ca-password "<temp-password>"
```

---

## Hand off to the client

Give the CA:
- **Login URL:** `https://<slug>.cafirmops.in/login`
- **Email** and **temporary password** — after first login they change it via the **avatar menu
  (top-right) → Change password**. Every user (CA, manager, employee) can change their own password
  there.

---

## Client first-run checklist (prepare the firm to use the app)

A newly onboarded firm starts **empty** (just the firm + the CA). The CA (or you, on their behalf)
should set it up in this order, all inside the app:

1. **Settings → Firm profile & branding** — brand name, logo, contact + escalation details (these
   appear in the UI and in the client notification emails).
2. **Settings → Categories of work** — add the firm's work categories (GST, Income Tax, MCA, etc.).
3. **Work Templates** — create reusable task templates (with sub-tasks) under each category.
4. **Employees** — add manager/employee staff accounts (email + role + temporary password).
5. **Clients** — add the firm's own clients.
6. **Tickets / Recurring** — start creating work and set up recurring schedules for periodic filings.

---

## Suspend / re-activate a client

In the console firms table, toggle the firm's **Active** switch off to suspend it: its users can no
longer log in and its data is hidden, but **nothing is deleted**. Toggle it back on to restore access.
(There is intentionally no "delete firm" action.)

---

## Why this is safe and needs no deployment

- Onboarding is one transaction inserting a `Firm` + first `CA`. It runs on the live database with no
  schema change, restart, or downtime.
- Tenant isolation is enforced centrally (per-`firmId`, via the Prisma extension in
  `backend/src/lib/prisma.ts`), so a new firm can never see other firms' data and existing firms are
  never read or modified during onboarding.
- The console + firm app are one deployment; you only deploy when shipping app changes, never per
  client.
