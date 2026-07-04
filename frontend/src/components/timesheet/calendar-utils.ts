import { format } from "date-fns";

// Full 24-hour day. The grid is taller than the viewport and scrolls internally;
// see DEFAULT_SCROLL_MINUTES for where the scroll container opens.
export const DAY_START = 0;
export const DAY_END = 24 * 60;
export const SLOT_MINUTES = 30;
export const HOUR_HEIGHT_PX = 56;
export const GRID_HEIGHT_PX = (HOUR_HEIGHT_PX * (DAY_END - DAY_START)) / 60; // 24h grid
// The calendar fills the available height and scrolls internally through the full
// 24-hour day (12 AM → 11 PM); it opens on the work day (~9 AM at the top) so the
// 10 AM–7 PM window is visible by default, and users can scroll up/down for the rest.
export const DEFAULT_SCROLL_MINUTES = 9 * 60;

export type TimesheetEntry = {
  id: string;
  ticketId: string;
  ticketNumber: number | string;
  ticketTitle: string;
  clientName: string;
  minutes: number;
  startMinutes: number;
  billable: boolean;
  description: string | null;
  workDate: string;
};

export type TicketOption = {
  id: string;
  ticketNumber: number | string;
  title: string;
  clientName: string;
};

export const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function minutesToTimeLabel(minutes: number): string {
  // 12-hour clock with AM/PM, e.g. 1 PM / 1:30 PM.
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m ? `${hour12}:${String(m).padStart(2, "0")} ${period}` : `${hour12} ${period}`;
}

export function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function blockStyle(startMinutes: number, minutes: number) {
  const top = ((startMinutes - DAY_START) / (DAY_END - DAY_START)) * 100;
  const height = (minutes / (DAY_END - DAY_START)) * 100;
  return { top: `${top}%`, height: `${Math.max(height, 2)}%` };
}

export function snapMinutes(raw: number): number {
  return Math.round(raw / SLOT_MINUTES) * SLOT_MINUTES;
}

export function yToMinutes(y: number, height: number): number {
  const ratio = Math.max(0, Math.min(1, y / height));
  const raw = DAY_START + ratio * (DAY_END - DAY_START);
  return Math.max(DAY_START, Math.min(DAY_END - SLOT_MINUTES, snapMinutes(raw)));
}

export function hourLabels(): { minutes: number; label: string }[] {
  const labels: { minutes: number; label: string }[] = [];
  for (let m = DAY_START; m < DAY_END; m += 60) {
    labels.push({ minutes: m, label: minutesToTimeLabel(m) });
  }
  return labels;
}

export function splitMinutes(total: number) {
  return { h: Math.floor(total / 60), m: total % 60 };
}

export function endMinutesFromDuration(startMinutes: number, durationMinutes: number): number {
  return startMinutes + durationMinutes;
}

export function durationFromTimeRange(
  startMinutes: number,
  endMinutes: number
): number | null {
  if (endMinutes <= startMinutes) return null;
  return endMinutes - startMinutes;
}

export function timeRangeLabel(startMinutes: number, durationMinutes: number): string {
  const end = startMinutes + durationMinutes;
  return `${minutesToTimeLabel(startMinutes)} – ${minutesToTimeLabel(end)}`;
}

function shortTimeLabel(minutes: number): string {
  // Compact 12-hour label, e.g. 1p / 1:30p.
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "p" : "a";
  const hour12 = h % 12 || 12;
  return m ? `${hour12}:${String(m).padStart(2, "0")}${period}` : `${hour12}${period}`;
}

export function shortTimeRangeLabel(startMinutes: number, durationMinutes: number): string {
  return `${shortTimeLabel(startMinutes)}–${shortTimeLabel(startMinutes + durationMinutes)}`;
}

export function entryEndMinutes(entry: Pick<TimesheetEntry, "startMinutes" | "minutes">): number {
  return entry.startMinutes + entry.minutes;
}

export function entriesOverlap(
  a: Pick<TimesheetEntry, "startMinutes" | "minutes">,
  b: Pick<TimesheetEntry, "startMinutes" | "minutes">
): boolean {
  return a.startMinutes < entryEndMinutes(b) && b.startMinutes < entryEndMinutes(a);
}

export type PositionedBlock = {
  entry: TimesheetEntry;
  column: number;
  columnCount: number;
};

/** Place overlapping blocks in side-by-side columns so labels stay readable. */
export function layoutDayEntries(entries: TimesheetEntry[]): PositionedBlock[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort(
    (a, b) => a.startMinutes - b.startMinutes || entryEndMinutes(b) - entryEndMinutes(a)
  );

  const assigned = new Set<string>();
  const positioned: PositionedBlock[] = [];

  for (const seed of sorted) {
    if (assigned.has(seed.id)) continue;

    const cluster: TimesheetEntry[] = [];
    const queue = [seed];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (assigned.has(current.id)) continue;
      assigned.add(current.id);
      cluster.push(current);
      for (const other of sorted) {
        if (!assigned.has(other.id) && entriesOverlap(current, other)) {
          queue.push(other);
        }
      }
    }

    const clusterSorted = [...cluster].sort((a, b) => a.startMinutes - b.startMinutes);
    const columnEnds: number[] = [];
    const columnById = new Map<string, number>();

    for (const entry of clusterSorted) {
      let column = columnEnds.findIndex((end) => end <= entry.startMinutes);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(0);
      }
      columnEnds[column] = entryEndMinutes(entry);
      columnById.set(entry.id, column);
    }

    const columnCount = Math.max(columnEnds.length, 1);
    for (const entry of clusterSorted) {
      positioned.push({
        entry,
        column: columnById.get(entry.id) ?? 0,
        columnCount,
      });
    }
  }

  return positioned;
}

export function blockHeightPx(minutes: number): number {
  return (minutes / (DAY_END - DAY_START)) * GRID_HEIGHT_PX;
}

export function blockPositionStyle(
  startMinutes: number,
  minutes: number,
  column: number,
  columnCount: number
): { top: string; height: string; left: string; width: string } {
  const top = ((startMinutes - DAY_START) / (DAY_END - DAY_START)) * 100;
  const height = (minutes / (DAY_END - DAY_START)) * 100;
  const widthPct = 100 / columnCount;
  const leftPct = column * widthPct;
  return {
    top: `${top}%`,
    height: `${Math.max(height, 2)}%`,
    left: `calc(${leftPct}% + 2px)`,
    width: `calc(${widthPct}% - 4px)`,
  };
}
