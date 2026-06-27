# CA Practice Management System

A full-stack work-management app for Chartered Accountant practices — clients, template-driven ticketing, recurring schedules, and analytics.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM
- Auth.js v5 (credentials)
- Nodemailer → Mailpit (dev email inbox)

---

## Run locally (Docker — prod branch)

Requires Docker running.

```bash
cp .env.example .env   # set ADMIN_EMAIL, ADMIN_PASSWORD, POSTGRES_PASSWORD
./scripts/compose.sh up --build
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |

The backend auto-migrates the DB and creates the admin user on first boot (no demo data).

---

## Run locally (dev server)

> Start Postgres first: `./scripts/compose.sh up -d db`

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`, then:

```bash
cd backend && npm install && npx prisma migrate dev && npm run db:seed
cd ../frontend && npm install && npm run dev
```

App: http://localhost:3000

---

## Admin login (prod branch)

| Role | Email | Password |
|---|---|---|
| CA (Admin) | `ADMIN_EMAIL` in your `.env` | `ADMIN_PASSWORD` in your `.env` |

On the `feature_1.0` branch, demo seed data and test users are still available.

---

## Features

- **Work Templates** — CA authors Task + ordered Sub-tasks under a Category (GST, ITR, MCA, PF, ESI…)
- **Template-driven tickets** — pick a template at create time; prefills fields and snapshots the checklist
- **Kanban board** — drag cards across Open → In Progress → Review → Done
- **Email notifications** — assignee gets an email (visible in Mailpit at :8025) on create/reassign
- **Recurring schedules** — auto-generate tickets per client on a schedule (monthly, quarterly…)
- **Analytics dashboard** — employee productivity, throughput, work-mix by category, client health
- **Role-based access** — CA sees everything; employees see their own work

---

## Cron (recurring ticket generation)

```bash
curl -X POST http://localhost:3000/api/cron/recurring \
  -H "Authorization: Bearer c0f487898ec28560067581803057de60"
```

Or use the **"Run generation now"** button on the /recurring page.
