"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  subDays,
  addDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { logTime } from "@/actions/tickets";
import { updateTimeEntry, deleteTimeEntry } from "@/actions/timesheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";

export type TimesheetEntry = {
  id: string;
  ticketId: string;
  ticketNumber: number | string;
  ticketTitle: string;
  clientName: string;
  minutes: number;
  billable: boolean;
  description: string | null;
  workDate: string;
};

type TicketOption = {
  id: string;
  ticketNumber: number | string;
  title: string;
  clientName: string;
};

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function TimesheetGrid({
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
  const router = useRouter();
  const pathname = usePathname();
  const [extra, setExtra] = useState<string[]>([]);

  const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) });

  // Pivot entries: rows by ticket, and a per-(ticket,day) bucket of entries.
  const rowMap = new Map<string, TicketOption>();
  const cellMap = new Map<string, TimesheetEntry[]>();
  for (const e of entries) {
    if (!rowMap.has(e.ticketId)) {
      rowMap.set(e.ticketId, {
        id: e.ticketId,
        ticketNumber: e.ticketNumber,
        title: e.ticketTitle,
        clientName: e.clientName,
      });
    }
    const k = `${e.ticketId}|${dayKey(new Date(e.workDate))}`;
    cellMap.set(k, [...(cellMap.get(k) ?? []), e]);
  }
  // Tickets added this session via the picker (so an empty row appears to log into).
  for (const id of extra) {
    if (!rowMap.has(id)) {
      const t = tickets.find((t) => t.id === id);
      if (t) rowMap.set(id, t);
    }
  }
  const rows = Array.from(rowMap.values());

  const cellMinutes = (ticketId: string, d: Date) =>
    (cellMap.get(`${ticketId}|${dayKey(d)}`) ?? []).reduce((s, e) => s + e.minutes, 0);
  const rowTotal = (ticketId: string) =>
    days.reduce((s, d) => s + cellMinutes(ticketId, d), 0);
  const dayTotal = (d: Date) =>
    rows.reduce((s, r) => s + cellMinutes(r.id, d), 0);
  const grandTotal = entries.reduce((s, e) => s + e.minutes, 0);
  const billableTotal = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);

  function goWeek(anchor: Date) {
    const f = startOfWeek(anchor, { weekStartsOn: 1 });
    const t = endOfWeek(anchor, { weekStartsOn: 1 });
    router.push(`${pathname}?from=${dayKey(f)}&to=${dayKey(t)}`);
  }

  const rangeLabel = `${format(new Date(from), "dd MMM")} – ${format(new Date(to), "dd MMM yyyy")}`;
  const isCurrentWeek = from === dayKey(startOfWeek(new Date(today), { weekStartsOn: 1 }));

  const pickerOptions = tickets.map((t) => ({
    value: t.id,
    label: `#${t.ticketNumber} · ${t.title} · ${t.clientName}`,
  }));

  return (
    <div className="space-y-4">
      {/* Week switcher + summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => goWeek(subDays(new Date(from), 7))} title="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => goWeek(new Date())} disabled={isCurrentWeek}>
            This week
          </Button>
          <Button variant="outline" size="icon" onClick={() => goWeek(addDays(new Date(from), 7))} title="Next week">
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-sm font-medium">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Total </span>
            <span className="font-semibold tabular">{fmtHours(grandTotal)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Billable </span>
            <span className="font-semibold tabular">{fmtHours(billableTotal)}</span>
          </span>
        </div>
      </div>

      {/* Add-row ticket picker */}
      <div className="max-w-md">
        <Combobox
          options={pickerOptions}
          value=""
          onChange={(id) => setExtra((prev) => (prev.includes(id) ? prev : [...prev, id]))}
          placeholder="Add a ticket to log against…"
          searchPlaceholder="Search tickets…"
          emptyText="No tickets found."
        />
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-primary/10">
              <th className="sticky left-0 z-10 bg-primary/10 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-primary">
                Ticket
              </th>
              {days.map((d) => (
                <th
                  key={dayKey(d)}
                  className={`min-w-20 px-2 py-2 text-center text-xs font-bold uppercase tracking-wide ${
                    dayKey(d) === today ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {format(d, "EEE")}
                  <span className="block text-[11px] font-normal">{format(d, "dd")}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-primary">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={days.length + 2} className="px-3 py-10 text-center text-muted-foreground">
                  No time logged this week. Pick a ticket above to start.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t even:bg-muted/30">
                  <td className="sticky left-0 z-10 max-w-56 truncate bg-background px-3 py-2 even:bg-muted/30">
                    <span className="font-medium">#{r.ticketNumber}</span>{" "}
                    <span className="text-muted-foreground">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.clientName}</span>
                  </td>
                  {days.map((d) => {
                    const k = `${r.id}|${dayKey(d)}`;
                    const cellEntries = cellMap.get(k) ?? [];
                    const mins = cellEntries.reduce((s, e) => s + e.minutes, 0);
                    return (
                      <td key={k} className="px-1 py-1 text-center">
                        <CellPopover
                          ticketId={r.id}
                          day={d}
                          today={today}
                          entries={cellEntries}
                          minutes={mins}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular">
                    {rowTotal(r.id) ? fmtHours(rowTotal(r.id)) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Daily total
                </td>
                {days.map((d) => (
                  <td key={dayKey(d)} className="px-2 py-2 text-center tabular">
                    {dayTotal(d) ? fmtHours(dayTotal(d)) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular">{fmtHours(grandTotal)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

function CellPopover({
  ticketId,
  day,
  today,
  entries,
  minutes,
}: {
  ticketId: string;
  day: Date;
  today: string;
  entries: TimesheetEntry[];
  minutes: number;
}) {
  const [open, setOpen] = useState(false);
  const isFuture = dayKey(day) > today;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isFuture}
          className={`flex h-9 w-full items-center justify-center rounded-md text-sm tabular transition-colors ${
            isFuture
              ? "cursor-not-allowed text-muted-foreground/30"
              : minutes
                ? "bg-primary/10 font-medium text-foreground hover:bg-primary/20"
                : "text-muted-foreground/40 hover:bg-accent"
          }`}
        >
          {minutes ? fmtHours(minutes) : isFuture ? "" : <Plus className="size-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-72 space-y-2 p-3">
        <p className="text-sm font-medium">{format(day, "EEEE, dd MMM yyyy")}</p>
        {entries.length > 0 ? (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <EntryLine key={e.id} entry={e} onDone={() => setOpen(false)} />
            ))}
          </ul>
        ) : null}
        <AddEntryForm ticketId={ticketId} day={day} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function splitMinutes(total: number) {
  return { h: Math.floor(total / 60), m: total % 60 };
}

function EntryLine({
  entry,
  onDone,
}: {
  entry: TimesheetEntry;
  onDone: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const init = splitMinutes(entry.minutes);
  const [hours, setHours] = useState(String(init.h || ""));
  const [mins, setMins] = useState(String(init.m || ""));
  const [billable, setBillable] = useState(entry.billable);
  const [note, setNote] = useState(entry.description ?? "");
  const [pending, start] = useTransition();

  function save() {
    const total = (Number(hours) || 0) * 60 + (Number(mins) || 0);
    if (total <= 0) {
      toast.error("Enter the time spent.");
      return;
    }
    start(async () => {
      const res = await updateTimeEntry(entry.id, {
        minutes: total,
        description: note.trim() || undefined,
        billable,
      });
      if (res.ok) {
        toast.success("Entry updated");
        setEditing(false);
        router.refresh();
        onDone();
      } else toast.error(res.error);
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteTimeEntry(entry.id);
      if (res.ok) {
        toast.success("Entry deleted");
        router.refresh();
        onDone();
      } else toast.error(res.error);
    });
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-sm">
        <span className="min-w-0">
          <span className="font-medium tabular">{fmtHours(entry.minutes)}</span>
          {!entry.billable ? <span className="ml-1 text-xs text-muted-foreground">(non-billable)</span> : null}
          {entry.description ? (
            <span className="block truncate text-xs text-muted-foreground">{entry.description}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(true)} disabled={pending}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={remove}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </Button>
        </span>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-sm border p-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Hours</Label>
          <Input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Minutes</Label>
          <Input type="number" min="0" max="59" value={mins} onChange={(e) => setMins(e.target.value)} className="h-8" />
        </div>
      </div>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-8" />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={billable} onCheckedChange={(v) => setBillable(v === true)} />
        Billable
      </label>
      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </li>
  );
}

function AddEntryForm({
  ticketId,
  day,
  onDone,
}: {
  ticketId: string;
  day: Date;
  onDone: () => void;
}) {
  const router = useRouter();
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");
  const [billable, setBillable] = useState(true);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function add() {
    const total = (Number(hours) || 0) * 60 + (Number(mins) || 0);
    if (total <= 0) {
      toast.error("Enter the time spent.");
      return;
    }
    start(async () => {
      const res = await logTime(ticketId, {
        minutes: total,
        workDate: dayKey(day),
        description: note.trim() || undefined,
        billable,
      });
      if (res.ok) {
        toast.success("Time logged");
        setHours("");
        setMins("");
        setNote("");
        router.refresh();
        onDone();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-2 rounded-sm border border-dashed p-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Hours</Label>
          <Input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Minutes</Label>
          <Input type="number" min="0" max="59" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="0" className="h-8" />
        </div>
      </div>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-8" />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={billable} onCheckedChange={(v) => setBillable(v === true)} />
        Billable
      </label>
      <Button size="sm" className="w-full" onClick={add} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add time
      </Button>
    </div>
  );
}
