"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { logTime } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fmtHours,
  minutesToTimeInput,
  timeInputToMinutes,
  durationFromTimeRange,
  timeRangeLabel,
  SLOT_MINUTES,
} from "@/components/timesheet/calendar-utils";

type Entry = {
  id: string;
  minutes: number;
  startMinutes?: number;
  description: string | null;
  workDate: string;
  user: { name: string } | null;
};

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export function TicketTimeLog({
  ticketId,
  targetMinutes,
  entries,
}: {
  ticketId: string;
  targetMinutes: number | null;
  entries: Entry[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [workDate, setWorkDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();

  const logged = entries.reduce((sum, e) => sum + e.minutes, 0);
  const pct = targetMinutes ? Math.min(100, Math.round((logged / targetMinutes) * 100)) : 0;

  function submit() {
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
    if (workDate > todayStr()) {
      toast.error("Work date cannot be in the future.");
      return;
    }
    start(async () => {
      const res = await logTime(ticketId, {
        minutes: total,
        startMinutes,
        workDate,
        description: description.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Time logged");
        setStartTime("09:00");
        setEndTime("10:00");
        setDescription("");
        setOpen(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold tabular">{fmtHours(logged)}</span>
          <span className="text-muted-foreground">
            {" "}
            logged{targetMinutes ? ` of ${fmtHours(targetMinutes)} target` : ""}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4" />
          Log time
        </Button>
      </div>

      {targetMinutes ? (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}

      {open ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" max={todayStr()} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you work on?" />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No time logged yet.</p>
      ) : (
        <ul className="divide-y">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="font-medium tabular">
                  {e.startMinutes != null
                    ? timeRangeLabel(e.startMinutes, e.minutes)
                    : fmtHours(e.minutes)}
                </span>
                {e.description ? (
                  <span className="text-muted-foreground">— {e.description}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {e.user?.name ?? "—"} · {format(new Date(e.workDate), "dd MMM")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
