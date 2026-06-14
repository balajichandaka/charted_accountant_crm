# Timesheet Calendar Redesign — Design Spec

**Date:** 2026-06-14  
**Status:** Approved  
**Route:** `/timesheet` (single page; `/timesheet/team` removed)

---

## Summary

Merge **Team Hours** into **Timesheet** as a role-gated tab. Replace the ticket×day grid with a **Google Calendar–style** week/day view for logging time. Every time block remains **ticket-required**. CA and MANAGER users get a **Team** tab to review employee hours; clicking a day cell opens a detail dialog.

---

## Approved decisions

| Topic | Decision |
|-------|----------|
| Ticket association | **A** — every block must link to a ticket |
| Calendar layout | **C** — week view default, toggle to day view |
| Manager team scope | **C** — CA sees all employees; MANAGER sees managed employees only |
| Implementation approach | Custom calendar (CSS grid + interactions), not a third-party calendar library |

---

## Roles & access

| Role | My Calendar tab | Team tab | Team scope | Edit own entries | Edit others' entries |
|------|-----------------|----------|------------|------------------|---------------------|
| EMPLOYEE | ✓ | ✗ | — | ✓ | ✗ |
| MANAGER | ✓ | ✓ | Assignees on tickets where `managerId = self` | ✓ | ✗ (view only in team dialog) |
| CA | ✓ | ✓ | All active employees | ✓ | ✓ |

---

## Navigation changes

- Remove sidebar item **Team Hours** (`/timesheet/team`, `caOnly: true`)
- Keep single **Timesheet** nav item for all users
- `/timesheet/team` redirects to `/timesheet?tab=team` (or `/timesheet` with team tab default for leadership)

---

## Employee calendar (My Calendar tab)

### Views

- **Week view (default):** Mon–Sun columns, 6:00–20:00 time grid (configurable constants)
- **Day view:** Single day, full hourly grid
- Toggle **Week | Day** in header; preserve anchor date in URL (`?from=&to=&view=week|day`)

### Interactions

| Action | Behavior |
|--------|----------|
| Click-drag empty slot | Open create form with pre-filled date + start time + duration from drag |
| Click block | Open edit popover/dialog |
| Drag block | Update `workDate` + `startMinutes` |
| Resize block bottom | Update `minutes` |
| Future dates | Disabled (match current rules) |

### Block display

- Label: `#ticketNumber · client · title`
- Subtext: duration (`2h 30m`)
- **Billable:** solid primary-blue block
- **Non-billable:** muted fill, dashed border

### Create/edit form fields

- **Ticket** (required, combobox — same ticket list as today)
- Start time (time input)
- Duration (hours + minutes)
- Description (optional)
- Billable (checkbox, default true)

---

## Team tab (CA + MANAGER only)

### Grid

- Rows: employees (filtered by role scope)
- Columns: Mon–Sun + Total + Billable
- Cells show `fmtHours` for that day; `—` when zero
- Clickable when minutes > 0

### Day detail dialog

Opened when leadership clicks an employee/day cell.

Contents:
- Employee name, date, day total
- List of entries: time range, ticket, client, duration, billable badge, description
- **CA:** edit + delete actions per entry
- **MANAGER:** read-only

---

## Data model change

Add to `TimeEntry`:

```prisma
startMinutes Int @default(540)  // minutes from midnight; default 9:00 AM
```

- `workDate` = calendar date (stored as DateTime at start of day or date portion)
- Block end = `startMinutes + minutes`
- Migration backfills existing rows with `startMinutes = 540`

No new tables. No optional ticket — `ticketId` remains required.

---

## API changes

### Modified

| Endpoint | Change |
|----------|--------|
| `POST /api/tickets/:id/time-entries` | Accept `startMinutes` (optional, default 540) |
| `PATCH /api/timesheet/entries/:id` | Accept `startMinutes`; validate no overlap optional v1 skip |
| `GET /api/timesheet` | Return `startMinutes`; allow MANAGER+CA to pass `?userId=` |
| `GET /api/timesheet/team` | Rename behavior: `requireLeadership` (CA or MANAGER); filter employees by role |

### New

`GET /api/timesheet/team/detail?userId=&date=yyyy-MM-dd`

- Auth: CA (any user) or MANAGER (only managed employees)
- Returns full entries for one employee on one day (same shape as timesheet entries + `startMinutes`)

### Manager employee scope (backend)

Managed employees for MANAGER role:

```sql
DISTINCT assigneeId FROM Ticket WHERE managerId = :currentUserId AND assigneeId IS NOT NULL
```

Union with active users only. CA uses all `isActive: true` users.

### Auth helpers

- Add `requireLeadership` middleware (CA or MANAGER)
- Extend PATCH/DELETE: MANAGER cannot edit others (unchanged — owner or CA only)

---

## Frontend structure

```
frontend/src/components/timesheet/
├── timesheet-shell.tsx          # tabs, header, week nav
├── calendar-week-view.tsx
├── calendar-day-view.tsx
├── time-block.tsx
├── time-block-form.tsx
├── team-hours-grid.tsx
├── team-day-detail-dialog.tsx
├── calendar-utils.ts          # snap, layout, fmt
└── use-calendar-dnd.ts        # drag/resize state (optional hook)

frontend/src/lib/session.ts      # add MANAGER role, requireLeadership()
frontend/src/components/app-shell.tsx  # remove Team Hours nav; fix role filter
```

**Remove after migration:**
- `timesheet-grid.tsx`
- `team-timesheet.tsx`
- `app/(app)/timesheet/team/page.tsx`

---

## URL & state

```
/timesheet?from=2026-06-09&to=2026-06-15&view=week&tab=my
/timesheet?from=2026-06-09&to=2026-06-15&tab=team
/timesheet?view=day&date=2026-06-11&tab=my
```

---

## Theme

- Reuse existing CSS variables (`--primary`, `--muted`, sidebar colors)
- `tabular-nums` for hours
- shadcn: `Card`, `Dialog`, `Popover`, `Button`, `Combobox`, `Tabs`
- Transitions: `transition-colors`, subtle shadow on drag
- Mobile: default to day view below `md` breakpoint

---

## Out of scope (v1)

- Month view
- Recurring blocks
- Time without ticket
- MANAGER editing others' entries
- Overlap detection / conflict warnings
- Calendar sync (Google/Outlook)

---

## Verification checklist

- [ ] EMPLOYEE sees only My Calendar; no Team tab
- [ ] MANAGER sees Team tab with managed employees only
- [ ] CA sees Team tab with all employees
- [ ] Create block requires ticket; appears at correct time
- [ ] Drag and resize update API
- [ ] Team day dialog shows correct entries
- [ ] `/timesheet/team` redirects
- [ ] Existing entries show at 9:00 AM default
- [ ] `npm run lint` and `npm run build` pass
