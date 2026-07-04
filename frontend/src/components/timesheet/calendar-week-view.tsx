"use client";

import { useEffect, useRef, useState } from "react";
import { format, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import {
  type TimesheetEntry,
  type TicketOption,
  dayKey,
  fmtHours,
  hourLabels,
  GRID_HEIGHT_PX,
  HOUR_HEIGHT_PX,
  DAY_START,
  DAY_END,
  DEFAULT_SCROLL_MINUTES,
} from "./calendar-utils";
import { DayTimeBlocks } from "./day-time-blocks";
import { TimeBlock, useDragCreate } from "./time-block";
import { TimeBlockForm } from "./time-block-form";

export function CalendarWeekView({
  entries,
  from,
  to,
  today,
  tickets,
}: {
  entries: TimesheetEntry[];
  from: string;
  to: string;
  today: string;
  tickets: TicketOption[];
}) {
  const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Open the scroll view on the work day rather than midnight (offset by the top spacer).
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        HOUR_HEIGHT_PX / 2 +
        (DEFAULT_SCROLL_MINUTES / (DAY_END - DAY_START)) * GRID_HEIGHT_PX;
    }
  }, []);
  const [formMode, setFormMode] = useState<
    | { kind: "create"; workDate: string; startMinutes: number; minutes: number }
    | { kind: "edit"; entry: TimesheetEntry }
    | null
  >(null);

  const entriesByDay = new Map<string, TimesheetEntry[]>();
  for (const e of entries) {
    const k = dayKey(new Date(e.workDate));
    entriesByDay.set(k, [...(entriesByDay.get(k) ?? []), e]);
  }

  const dragCreate = useDragCreate({
    today,
    onCreate: (workDate, startMinutes, minutes) => {
      setFormMode({ kind: "create", workDate, startMinutes, minutes });
      setFormOpen(true);
    },
  });

  const hours = hourLabels();

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto rounded-lg border">
        <div className="flex min-h-0 flex-1 flex-col min-w-[720px]">
          <div className="grid shrink-0 grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/30">
            <div />
            {days.map((d) => (
              <div
                key={dayKey(d)}
                className={cn(
                  "border-l px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide",
                  dayKey(d) === today ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className="block">{format(d, "EEE")}</span>
                <span className="text-base font-bold normal-case">{format(d, "d")}</span>
              </div>
            ))}
          </div>
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto"
          >
          {/* Top clearance so the first hour (12 AM) isn't flush against the edge. */}
          <div aria-hidden style={{ height: HOUR_HEIGHT_PX / 2 }} />
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
            <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
              {hours.map((h) => (
                <div
                  key={h.minutes}
                  className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular"
                  style={{ top: `${((h.minutes - DAY_START) / (DAY_END - DAY_START)) * 100}%` }}
                >
                  {h.label}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const k = dayKey(d);
              const dayEntries = entriesByDay.get(k) ?? [];
              const isFuture = k > today;
              return (
                <div
                  key={k}
                  data-day-column
                  className={cn(
                    "relative border-l",
                    isFuture && "bg-muted/20",
                    !isFuture && "cursor-crosshair"
                  )}
                  style={{ height: GRID_HEIGHT_PX }}
                  onPointerDown={(e) => !isFuture && dragCreate.onColumnDown(e, k)}
                  onPointerMove={dragCreate.onColumnMove}
                  onPointerUp={dragCreate.onColumnUp}
                >
                  {hours.map((h) => (
                    <div
                      key={h.minutes}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/40"
                      style={{ top: `${((h.minutes - DAY_START) / (DAY_END - DAY_START)) * 100}%` }}
                    />
                  ))}
                  <div
                    data-drag-ghost
                    className="pointer-events-none absolute inset-x-1 hidden rounded-md border border-dashed border-primary/50 bg-primary/10"
                  />
                  <DayTimeBlocks
                    entries={dayEntries}
                    dayDate={k}
                    onEdit={(entry) => {
                      setFormMode({ kind: "edit", entry });
                      setFormOpen(true);
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Bottom clearance so the last hour (11 PM) isn't flush against the edge. */}
          <div aria-hidden style={{ height: HOUR_HEIGHT_PX / 2 }} />
          </div>
        </div>
      </div>

      <TimeBlockForm
        key={
          formMode
            ? formMode.kind === "edit"
              ? formMode.entry.id
              : `${formMode.workDate}-${formMode.startMinutes}`
            : "closed"
        }
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        tickets={tickets}
      />
    </>
  );
}

export function weekTotals(entries: TimesheetEntry[]) {
  const total = entries.reduce((s, e) => s + e.minutes, 0);
  const billable = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);
  return { total, billable, fmtTotal: fmtHours(total), fmtBillable: fmtHours(billable) };
}
