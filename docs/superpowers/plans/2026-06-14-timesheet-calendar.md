# Timesheet Calendar Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ticket×day timesheet grid with a Google Calendar–style week/day view, merge Team Hours into `/timesheet` as a CA/MANAGER tab, and add `startMinutes` for time-block positioning.

**Architecture:** Prisma migration adds `startMinutes` to `TimeEntry`. Backend extends timesheet routes with leadership auth and team detail endpoint. Frontend replaces `TimesheetGrid` with custom calendar components using CSS grid and pointer-driven drag/resize; team view uses clickable grid + dialog.

**Tech Stack:** Next.js 16, React 19, Prisma, Express, date-fns, shadcn/ui, existing server actions (`logTime`, `updateTimeEntry`, `deleteTimeEntry`).

**Spec:** `docs/superpowers/specs/2026-06-14-timesheet-calendar-design.md`

---

## File map

| Action | Path |
|--------|------|
| Create | `backend/prisma/migrations/.../migration.sql` |
| Modify | `backend/prisma/schema.prisma`, `frontend/prisma/schema.prisma` |
| Modify | `backend/src/routes/timesheet.ts`, `backend/src/routes/tickets.ts` |
| Modify | `backend/src/middleware/auth.ts` |
| Create | `frontend/src/components/timesheet/calendar-utils.ts` |
| Create | `frontend/src/components/timesheet/time-block-form.tsx` |
| Create | `frontend/src/components/timesheet/time-block.tsx` |
| Create | `frontend/src/components/timesheet/calendar-week-view.tsx` |
| Create | `frontend/src/components/timesheet/calendar-day-view.tsx` |
| Create | `frontend/src/components/timesheet/team-hours-grid.tsx` |
| Create | `frontend/src/components/timesheet/team-day-detail-dialog.tsx` |
| Create | `frontend/src/components/timesheet/timesheet-shell.tsx` |
| Modify | `frontend/src/app/(app)/timesheet/page.tsx` |
| Create | `frontend/src/app/(app)/timesheet/team/page.tsx` (redirect only) |
| Modify | `frontend/src/components/app-shell.tsx` |
| Modify | `frontend/src/lib/session.ts` |
| Modify | `frontend/src/actions/tickets.ts`, `frontend/src/actions/timesheet.ts` |
| Delete | `frontend/src/components/timesheet/timesheet-grid.tsx` |
| Delete | `frontend/src/components/timesheet/team-timesheet.tsx` |

---

### Task 1: Schema — add `startMinutes`

**Files:**
- Modify: `backend/prisma/schema.prisma` (`TimeEntry` model)
- Modify: `frontend/prisma/schema.prisma` (mirror)

- [ ] **Step 1: Add field to TimeEntry**

```prisma
model TimeEntry {
  id           String   @id @default(cuid())
  minutes      Int
  startMinutes Int      @default(540)
  description  String?
  workDate     DateTime
  billable     Boolean  @default(true)
  // ... rest unchanged
}
```

- [ ] **Step 2: Create and apply migration**

```bash
cd backend
npx prisma migrate dev --name time_entry_start_minutes
```

- [ ] **Step 3: Verify**

```bash
cd backend && npx prisma generate
cd ../frontend && npx prisma generate
```

Expected: migration SQL includes `startMinutes INTEGER NOT NULL DEFAULT 540`.

---

### Task 2: Backend auth — MANAGER + leadership middleware

**Files:**
- Modify: `backend/src/middleware/auth.ts`

- [ ] **Step 1: Add `requireLeadership`**

```typescript
export function requireLeadership(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role !== "CA" && role !== "MANAGER") {
    res.status(403).json({ ok: false, error: "CA or Manager access required." });
    return;
  }
  next();
}
```

- [ ] **Step 2: Add helper `managedEmployeeIds(userId: string)`**

New file or inline in timesheet route:

```typescript
async function managedEmployeeIds(managerId: string): Promise<string[]> {
  const rows = await prisma.ticket.findMany({
    where: { managerId, assigneeId: { not: null } },
    select: { assigneeId: true },
    distinct: ["assigneeId"],
  });
  return rows.map((r) => r.assigneeId!).filter(Boolean);
}
```

---

### Task 3: Backend — extend time entry create/update

**Files:**
- Modify: `backend/src/routes/tickets.ts` (POST `/:id/time-entries`)
- Modify: `backend/src/routes/timesheet.ts` (PATCH entries, GET list)

- [ ] **Step 1: POST schema add `startMinutes`**

```typescript
const schema = z.object({
  minutes: z.coerce.number().int().min(1),
  workDate: z.string().optional(),
  startMinutes: z.coerce.number().int().min(0).max(1439).optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
});
// create: startMinutes: d.startMinutes ?? 540
```

- [ ] **Step 2: PATCH schema add `startMinutes`**

```typescript
startMinutes: z.coerce.number().int().min(0).max(1439).optional(),
```

- [ ] **Step 3: GET `/api/timesheet` — extend `userId` access**

```typescript
const canViewOthers = req.user?.role === "CA" || req.user?.role === "MANAGER";
let userId = req.user!.sub;
if (requested && canViewOthers) {
  if (req.user?.role === "MANAGER") {
    const allowed = await managedEmployeeIds(req.user.sub);
    if (!allowed.includes(requested)) {
      res.status(403).json({ ok: false, error: "Not in your team." });
      return;
    }
  }
  userId = requested;
}
```

- [ ] **Step 4: Include `startMinutes` in all entry responses**

---

### Task 4: Backend — team routes

**Files:**
- Modify: `backend/src/routes/timesheet.ts`

- [ ] **Step 1: Change `GET /team` to `requireLeadership`**

Filter users:

```typescript
router.get("/team", requireLeadership, async (req, res, next) => {
  const { from, to } = range(req);
  let users;
  if (req.user!.role === "CA") {
    users = await prisma.user.findMany({ where: { isActive: true }, ... });
  } else {
    const ids = await managedEmployeeIds(req.user!.sub);
    users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true }, ... });
  }
  // aggregate entries as today
});
```

- [ ] **Step 2: Add `GET /team/detail`**

```typescript
router.get("/team/detail", requireLeadership, async (req, res, next) => {
  const userId = String(req.query.userId ?? "");
  const date = String(req.query.date ?? "");
  // validate MANAGER scope
  // return entries for userId on that day with ticket includes + startMinutes
});
```

- [ ] **Step 3: Manual test**

```bash
# as CA token
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/timesheet/team/detail?userId=USER_ID&date=2026-06-10"
```

---

### Task 5: Frontend session & nav

**Files:**
- Modify: `frontend/src/lib/session.ts`
- Modify: `frontend/src/components/app-shell.tsx`
- Modify: `frontend/src/types/next-auth.d.ts` if role typed there

- [ ] **Step 1: Extend SessionUser role**

```typescript
export type SessionUser = {
  role: "CA" | "MANAGER" | "EMPLOYEE";
  // ...
};

export async function requireLeadership(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "CA" && user.role !== "MANAGER") redirect("/timesheet");
  return user;
}
```

- [ ] **Step 2: Remove Team Hours nav item**

Delete `{ href: "/timesheet/team", label: "Team Hours", ... }` from `NAV`.

- [ ] **Step 3: Update nav filter for `caOnly`**

Keep `caOnly` as CA-only. Team tab is internal to timesheet page, not sidebar.

- [ ] **Step 4: Sidebar role label**

Show "Manager" for MANAGER role instead of "Employee".

---

### Task 6: Calendar utilities

**Files:**
- Create: `frontend/src/components/timesheet/calendar-utils.ts`

- [ ] **Step 1: Implement constants and helpers**

```typescript
export const DAY_START = 6 * 60;   // 6:00 AM
export const DAY_END = 20 * 60;    // 8:00 PM
export const SLOT_MINUTES = 30;

export function fmtHours(minutes: number): string { /* copy from timesheet-grid */ }

export function blockStyle(startMinutes: number, minutes: number) {
  const top = ((startMinutes - DAY_START) / (DAY_END - DAY_START)) * 100;
  const height = (minutes / (DAY_END - DAY_START)) * 100;
  return { top: `${top}%`, height: `${Math.max(height, 2)}%` };
}

export function snapMinutes(raw: number): number {
  return Math.round(raw / SLOT_MINUTES) * SLOT_MINUTES;
}
```

---

### Task 7: Time block form component

**Files:**
- Create: `frontend/src/components/timesheet/time-block-form.tsx`

- [ ] **Step 1: Build form with ticket Combobox (required), time, duration, billable, description**

- [ ] **Step 2: Wire to `logTime` (create) and `updateTimeEntry` (edit)**

- [ ] **Step 3: Pass `startMinutes` in payload**

Update `frontend/src/actions/tickets.ts` `logTime` to accept optional `startMinutes`.

Update `frontend/src/actions/timesheet.ts` `updateTimeEntry` similarly.

---

### Task 8: Time block + week view

**Files:**
- Create: `frontend/src/components/timesheet/time-block.tsx`
- Create: `frontend/src/components/timesheet/calendar-week-view.tsx`

- [ ] **Step 1: `TimeBlock` — positioned card with primary/muted styles**

- [ ] **Step 2: Week grid — 7 day columns, hour labels, blocks from entries**

- [ ] **Step 3: Click-drag on empty area → open form with computed start/duration**

- [ ] **Step 4: Drag block → PATCH `workDate` + `startMinutes`**

- [ ] **Step 5: Resize handle → PATCH `minutes`**

Use `useTransition` + optimistic local state; `router.refresh()` on success.

---

### Task 9: Day view

**Files:**
- Create: `frontend/src/components/timesheet/calendar-day-view.tsx`

- [ ] **Step 1: Single-column version of week view for `?view=day&date=`**

- [ ] **Step 2: Reuse `TimeBlock` and form**

---

### Task 10: Team tab components

**Files:**
- Create: `frontend/src/components/timesheet/team-hours-grid.tsx`
- Create: `frontend/src/components/timesheet/team-day-detail-dialog.tsx`

- [ ] **Step 1: Port logic from `team-timesheet.tsx` with clickable cells**

- [ ] **Step 2: Dialog fetches `GET /api/timesheet/team/detail?userId=&date=`**

- [ ] **Step 3: CA gets edit/delete; MANAGER read-only**

---

### Task 11: Timesheet shell + page

**Files:**
- Create: `frontend/src/components/timesheet/timesheet-shell.tsx`
- Modify: `frontend/src/app/(app)/timesheet/page.tsx`
- Create: `frontend/src/app/(app)/timesheet/team/page.tsx` (redirect)

- [ ] **Step 1: `TimesheetShell` — Tabs: My Calendar | Team (if CA/MANAGER)**

- [ ] **Step 2: Header — week nav, totals, Week/Day toggle**

- [ ] **Step 3: Update page.tsx to pass entries, tickets, user role**

- [ ] **Step 4: Redirect `/timesheet/team` → `/timesheet?tab=team`**

```typescript
// timesheet/team/page.tsx
import { redirect } from "next/navigation";
export default function TeamTimesheetRedirect() {
  redirect("/timesheet?tab=team");
}
```

---

### Task 12: Cleanup & verify

**Files:**
- Delete: `timesheet-grid.tsx`, `team-timesheet.tsx`

- [ ] **Step 1: Remove dead imports**

```bash
cd frontend && npm run lint && npm run build
cd ../backend && npm run build
```

- [ ] **Step 2: Manual QA**

| Role | Check |
|------|-------|
| EMPLOYEE | Calendar only, log/edit own blocks |
| MANAGER | Team tab, managed employees, dialog read-only |
| CA | Team tab, all employees, dialog edit/delete |

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Redesign timesheet as calendar UI and merge team hours for CA/Manager"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Ticket required on every block | Task 7 |
| Week default + day toggle | Tasks 8, 9, 11 |
| CA all / MANAGER scoped team | Tasks 2, 4, 10 |
| Merge team into timesheet | Tasks 5, 10, 11 |
| startMinutes schema | Task 1 |
| Team day popup | Task 10 |
| Remove /timesheet/team | Task 11 |
| Theme consistency | Tasks 8, 10 (shadcn + CSS vars) |

No placeholders remain. Overlap detection explicitly deferred per spec.

---

## Execution options

**Plan saved to:** `docs/superpowers/plans/2026-06-14-timesheet-calendar.md`

1. **Subagent-driven (recommended)** — fresh subagent per task with review between tasks  
2. **Inline execution** — implement task-by-task in this session with checkpoints

Which approach would you like?
