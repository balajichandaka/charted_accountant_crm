"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTimeEntry } from "@/actions/timesheet";
import { cn } from "@/lib/utils";
import {
  type TimesheetEntry,
  blockStyle,
  blockPositionStyle,
  blockHeightPx,
  fmtHours,
  timeRangeLabel,
  shortTimeRangeLabel,
  snapMinutes,
  DAY_START,
  DAY_END,
  SLOT_MINUTES,
  GRID_HEIGHT_PX,
  yToMinutes,
} from "./calendar-utils";

type DragKind = "move" | "resize" | null;

export function TimeBlock({
  entry,
  dayDate,
  column = 0,
  columnCount = 1,
  readOnly,
  onEdit,
}: {
  entry: TimesheetEntry;
  dayDate: string;
  column?: number;
  columnCount?: number;
  readOnly?: boolean;
  onEdit: (entry: TimesheetEntry) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const blockRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    kind: DragKind;
    startY: number;
    origStart: number;
    origMinutes: number;
    column: HTMLDivElement;
  } | null>(null);

  const style = blockPositionStyle(entry.startMinutes, entry.minutes, column, columnCount);
  const heightPx = blockHeightPx(entry.minutes);
  const compact = heightPx < 40;
  const narrow = columnCount > 1;
  const label = timeRangeLabel(entry.startMinutes, entry.minutes);
  const title = `${entry.ticketNumber} ${entry.ticketTitle} · ${label} · ${fmtHours(entry.minutes)}`;

  function getColumn(): HTMLDivElement | null {
    return blockRef.current?.closest("[data-day-column]") as HTMLDivElement | null;
  }

  function pointerY(e: React.PointerEvent, col: HTMLDivElement) {
    const rect = col.getBoundingClientRect();
    return e.clientY - rect.top;
  }

  function onMoveDown(e: React.PointerEvent) {
    if (readOnly || pending) return;
    const col = getColumn();
    if (!col) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "move",
      startY: pointerY(e, col),
      origStart: entry.startMinutes,
      origMinutes: entry.minutes,
      column: col,
    };
  }

  function onResizeDown(e: React.PointerEvent) {
    if (readOnly || pending) return;
    const col = getColumn();
    if (!col) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "resize",
      startY: pointerY(e, col),
      origStart: entry.startMinutes,
      origMinutes: entry.minutes,
      column: col,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !blockRef.current) return;
    const y = pointerY(e, drag.column);
    const deltaY = y - drag.startY;
    const deltaMinutes = snapMinutes(
      (deltaY / GRID_HEIGHT_PX) * (DAY_END - DAY_START)
    );

    if (drag.kind === "move") {
      const next = Math.max(
        DAY_START,
        Math.min(DAY_END - drag.origMinutes, drag.origStart + deltaMinutes)
      );
      blockRef.current.style.top = blockStyle(next, drag.origMinutes).top;
    } else if (drag.kind === "resize") {
      const next = Math.max(
        SLOT_MINUTES,
        Math.min(DAY_END - drag.origStart, drag.origMinutes + deltaMinutes)
      );
      blockRef.current.style.height = blockStyle(drag.origStart, next).height;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    const y = pointerY(e, drag.column);
    const deltaY = y - drag.startY;
    if (Math.abs(deltaY) < 4 && drag.kind === "move") {
      onEdit(entry);
      return;
    }

    const deltaMinutes = snapMinutes(
      (deltaY / GRID_HEIGHT_PX) * (DAY_END - DAY_START)
    );

    if (drag.kind === "move") {
      const startMinutes = Math.max(
        DAY_START,
        Math.min(DAY_END - drag.origMinutes, drag.origStart + deltaMinutes)
      );
      if (startMinutes === drag.origStart) return;
      start(async () => {
        const res = await updateTimeEntry(entry.id, { startMinutes, workDate: dayDate });
        if (res.ok) router.refresh();
        else toast.error(res.error);
      });
    } else if (drag.kind === "resize") {
      const minutes = Math.max(
        SLOT_MINUTES,
        Math.min(DAY_END - drag.origStart, drag.origMinutes + deltaMinutes)
      );
      if (minutes === drag.origMinutes) return;
      start(async () => {
        const res = await updateTimeEntry(entry.id, { minutes });
        if (res.ok) router.refresh();
        else toast.error(res.error);
      });
    }
  }

  return (
    <div
      ref={blockRef}
      data-time-block
      className={cn(
        "absolute z-10 overflow-hidden rounded-md border px-1 py-0.5 text-xs shadow-sm",
        entry.billable
          ? "border-primary/30 bg-primary/15 text-foreground"
          : "border-muted-foreground/20 bg-muted/60 text-muted-foreground",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        pending && "opacity-60",
        narrow && "text-[10px] leading-tight"
      )}
      style={style}
      onPointerDown={onMoveDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={title}
    >
      {narrow ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-medium">{entry.ticketNumber}</p>
          {!compact ? (
            <p className="truncate opacity-80">{entry.ticketTitle}</p>
          ) : null}
          <p className="truncate tabular opacity-80">
            {compact
              ? shortTimeRangeLabel(entry.startMinutes, entry.minutes)
              : label}
          </p>
        </div>
      ) : compact ? (
        <p className="truncate font-medium leading-tight">
          {entry.ticketNumber}
          <span className="font-normal opacity-80">
            {" "}
            · {shortTimeRangeLabel(entry.startMinutes, entry.minutes)}
          </span>
        </p>
      ) : (
        <>
          <p className="truncate font-medium leading-tight">
            {entry.ticketNumber} {entry.ticketTitle}
          </p>
          <p className="truncate text-[10px] opacity-80 tabular">{label}</p>
        </>
      )}
      {!readOnly ? (
        <div
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize hover:bg-primary/30"
          onPointerDown={onResizeDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ) : null}
    </div>
  );
}

export function useDragCreate({
  today,
  onCreate,
}: {
  today: string;
  onCreate: (workDate: string, startMinutes: number, minutes: number) => void;
}) {
  const dragRef = useRef<{ day: string; startY: number } | null>(null);

  function onColumnDown(e: React.PointerEvent, day: string) {
    if (day > today) return;
    if ((e.target as HTMLElement).closest("[data-time-block]")) return;
    const col = e.currentTarget;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    col.setPointerCapture(e.pointerId);
    dragRef.current = { day, startY: y };
  }

  function onColumnMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const col = e.currentTarget;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const start = yToMinutes(Math.min(dragRef.current.startY, y), rect.height);
    const end = yToMinutes(Math.max(dragRef.current.startY, y), rect.height);
    const ghost = col.querySelector("[data-drag-ghost]") as HTMLElement | null;
    if (ghost) {
      const top = blockStyle(start, Math.max(SLOT_MINUTES, end - start)).top;
      const height = blockStyle(start, Math.max(SLOT_MINUTES, end - start)).height;
      ghost.style.display = "block";
      ghost.style.top = top;
      ghost.style.height = height;
    }
  }

  function onColumnUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    const col = e.currentTarget;
    const ghost = col.querySelector("[data-drag-ghost]") as HTMLElement | null;
    if (ghost) ghost.style.display = "none";
    if (!drag) return;

    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const delta = Math.abs(y - drag.startY);
    const start = yToMinutes(Math.min(drag.startY, y), rect.height);
    const end = yToMinutes(Math.max(drag.startY, y), rect.height);
    const minutes = Math.max(SLOT_MINUTES, end - start);

    if (delta < 8) {
      onCreate(drag.day, start, SLOT_MINUTES);
    } else {
      onCreate(drag.day, start, minutes);
    }
  }

  return { onColumnDown, onColumnMove, onColumnUp };
}
