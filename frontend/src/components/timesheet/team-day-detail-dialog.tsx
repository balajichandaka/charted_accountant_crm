"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getTeamDayDetail, updateTimeEntry, deleteTimeEntry } from "@/actions/timesheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type TimesheetEntry,
  fmtHours,
  minutesToTimeInput,
  timeInputToMinutes,
  endMinutesFromDuration,
  durationFromTimeRange,
  timeRangeLabel,
  SLOT_MINUTES,
} from "./calendar-utils";

function EntryRow({
  entry,
  canEdit,
  onChanged,
}: {
  entry: TimesheetEntry;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [startTime, setStartTime] = useState(minutesToTimeInput(entry.startMinutes));
  const [endTime, setEndTime] = useState(
    minutesToTimeInput(endMinutesFromDuration(entry.startMinutes, entry.minutes))
  );
  const [billable, setBillable] = useState(entry.billable);
  const [note, setNote] = useState(entry.description ?? "");

  function save() {
    const startMinutes = timeInputToMinutes(startTime);
    const endMinutes = timeInputToMinutes(endTime);
    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time.");
      return;
    }
    const total = durationFromTimeRange(startMinutes, endMinutes);
    if (!total || total < SLOT_MINUTES) {
      toast.error("Time block must be at least 30 minutes.");
      return;
    }
    start(async () => {
      const res = await updateTimeEntry(entry.id, {
        minutes: total,
        startMinutes,
        description: note.trim() || undefined,
        billable,
      });
      if (res.ok) {
        toast.success("Entry updated");
        setEditing(false);
        router.refresh();
        onChanged();
      } else toast.error(res.error);
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteTimeEntry(entry.id);
      if (res.ok) {
        toast.success("Entry deleted");
        router.refresh();
        onChanged();
      } else toast.error(res.error);
    });
  }

  if (!canEdit || !editing) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-sm">
        <span className="min-w-0">
          <span className="font-medium">
            #{entry.ticketNumber} {entry.ticketTitle}
          </span>
          <span className="ml-2 tabular text-muted-foreground">
            {timeRangeLabel(entry.startMinutes, entry.minutes)}
          </span>
          {!entry.billable ? (
            <span className="ml-1 text-xs text-muted-foreground">(non-billable)</span>
          ) : null}
          {entry.description ? (
            <span className="block truncate text-xs text-muted-foreground">{entry.description}</span>
          ) : null}
        </span>
        {canEdit ? (
          <span className="flex shrink-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setEditing(true)}
              disabled={pending}
            >
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
        ) : null}
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-sm border p-2">
      <p className="text-sm font-medium">
        #{entry.ticketNumber} {entry.ticketTitle}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Start time</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End time</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-8"
          />
        </div>
      </div>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="h-8"
      />
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

export function TeamDayDetailDialog({
  open,
  onOpenChange,
  userId,
  userName,
  date,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  date: string;
  canEdit: boolean;
}) {
  const [data, setData] = useState<{
    entries: TimesheetEntry[];
    totalMinutes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId || !date) return;

    let cancelled = false;
    getTeamDayDetail(userId, date).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData({ entries: res.data.entries, totalMinutes: res.data.totalMinutes });
        setError(null);
      } else {
        setData(null);
        setError(res.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, userId, date]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setData(null);
      setError(null);
    }
    onOpenChange(next);
  }

  const loading = open && data === null && !error;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {userName} — {date ? format(new Date(date), "EEEE, dd MMM yyyy") : ""}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground tabular">
                {fmtHours(data?.totalMinutes ?? 0)}
              </span>
              {!canEdit ? (
                <span className="ml-2 text-xs">(view only)</span>
              ) : null}
            </p>
            {data && data.entries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No entries for this day.</p>
            ) : data ? (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {data.entries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    canEdit={canEdit}
                    onChanged={() => {
                      setData(null);
                      getTeamDayDetail(userId, date).then((res) => {
                        if (res.ok) {
                          setData({
                            entries: res.data.entries,
                            totalMinutes: res.data.totalMinutes,
                          });
                        }
                      });
                    }}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
