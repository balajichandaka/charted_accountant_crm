"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  type TimesheetEntry,
  type TicketOption,
  dayKey,
  hourLabels,
  GRID_HEIGHT_PX,
  HOUR_HEIGHT_PX,
  DAY_START,
  DAY_END,
  DEFAULT_SCROLL_MINUTES,
} from "./calendar-utils";
import { DayTimeBlocks } from "./day-time-blocks";
import { useDragCreate } from "./time-block";
import { TimeBlockForm } from "./time-block-form";

export function CalendarDayView({
  entries,
  date,
  today,
  tickets,
}: {
  entries: TimesheetEntry[];
  date: string;
  today: string;
  tickets: TicketOption[];
}) {
  const columnRef = useRef<HTMLDivElement | null>(null);
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

  const dayEntries = entries.filter((e) => dayKey(new Date(e.workDate)) === date);
  const isFuture = date > today;
  const hours = hourLabels();

  const dragCreate = useDragCreate({
    today,
    onCreate: (workDate, startMinutes, minutes) => {
      setFormMode({ kind: "create", workDate, startMinutes, minutes });
      setFormOpen(true);
    },
  });

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="shrink-0 border-b bg-muted/30 px-4 py-2 text-center">
          <span className="text-sm font-semibold">{format(new Date(date), "EEEE, dd MMM yyyy")}</span>
        </div>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto"
        >
        {/* Top clearance so the first hour (12 AM) isn't flush against the edge. */}
        <div aria-hidden style={{ height: HOUR_HEIGHT_PX / 2 }} />
        <div className="grid grid-cols-[3.5rem_1fr]">
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
          <div
            ref={columnRef}
            data-day-column
            className={cn(
              "relative border-l",
              isFuture && "bg-muted/20",
              !isFuture && "cursor-crosshair"
            )}
            style={{ height: GRID_HEIGHT_PX }}
            onPointerDown={(e) => !isFuture && dragCreate.onColumnDown(e, date)}
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
              className="pointer-events-none absolute inset-x-2 hidden rounded-md border border-dashed border-primary/50 bg-primary/10"
            />
            <DayTimeBlocks
              entries={dayEntries}
              dayDate={date}
              onEdit={(entry) => {
                setFormMode({ kind: "edit", entry });
                setFormOpen(true);
              }}
            />
          </div>
        </div>
        {/* Bottom clearance so the last hour (11 PM) isn't flush against the edge. */}
        <div aria-hidden style={{ height: HOUR_HEIGHT_PX / 2 }} />
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
