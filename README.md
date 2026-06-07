# CA Practice Management System

A full-stack work-management app for Chartered Accountant practices — clients, template-driven ticketing, recurring schedules, and analytics.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM
- Auth.js v5 (credentials)
- Nodemailer → Mailpit (dev email inbox)

---

## Run locally (Docker — one command)

Requires Docker / Colima running.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| Email inbox (Mailpit) | http://localhost:8025 |

The container auto-migrates the DB and seeds demo data on first start.

---

## Run locally (dev server — no Docker needed for app)

> Start DB and Mailpit first: `docker compose up db mailpit -d`

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

App: http://localhost:3000

---

## Demo login credentials

| Role | Email | Password |
|---|---|---|
| CA (Admin) | ca@firm.test | password123 |
| Employee | priya@firm.test | password123 |
| Employee | rahul@firm.test | password123 |

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
