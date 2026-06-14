"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logTime } from "@/actions/tickets";
import { updateTimeEntry, deleteTimeEntry } from "@/actions/timesheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type TicketOption,
  type TimesheetEntry,
  minutesToTimeInput,
  timeInputToMinutes,
  endMinutesFromDuration,
  durationFromTimeRange,
  DAY_END,
  SLOT_MINUTES,
} from "./calendar-utils";

type FormMode =
  | { kind: "create"; workDate: string; startMinutes: number; minutes: number }
  | { kind: "edit"; entry: TimesheetEntry };

export function TimeBlockForm({
  open,
  onOpenChange,
  mode,
  tickets,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: FormMode | null;
  tickets: TicketOption[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const isEdit = mode?.kind === "edit";
  const initialTicketId = isEdit ? mode.entry.ticketId : "";
  const initialStart = isEdit
    ? mode.entry.startMinutes
    : mode?.kind === "create"
      ? mode.startMinutes
      : 540;
  const initialDuration = isEdit
    ? mode.entry.minutes
    : mode?.kind === "create"
      ? mode.minutes
      : 60;
  const initialBillable = isEdit ? mode.entry.billable : true;
  const initialNote = isEdit ? (mode.entry.description ?? "") : "";
  const workDate =
    mode?.kind === "edit"
      ? format(new Date(mode.entry.workDate), "yyyy-MM-dd")
      : mode?.kind === "create"
        ? mode.workDate
        : "";

  const [ticketId, setTicketId] = useState(initialTicketId);
  const [startTime, setStartTime] = useState(minutesToTimeInput(initialStart));
  const [endTime, setEndTime] = useState(
    minutesToTimeInput(endMinutesFromDuration(initialStart, initialDuration))
  );
  const [billable, setBillable] = useState(initialBillable);
  const [note, setNote] = useState(initialNote);

  if (!mode) return null;

  const pickerOptions = tickets.map((t) => ({
    value: t.id,
    label: `#${t.ticketNumber} · ${t.title} · ${t.clientName}`,
  }));

  function resetAndClose() {
    onOpenChange(false);
    onDone?.();
  }

  function save() {
    if (!isEdit && !ticketId) {
      toast.error("Select a ticket.");
      return;
    }
    const startMinutes = timeInputToMinutes(startTime);
    const endMinutes = timeInputToMinutes(endTime);
    if (startMinutes < 0 || startMinutes >= DAY_END) {
      toast.error("Start time must be within the calendar day.");
      return;
    }
    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time.");
      return;
    }
    if (endMinutes > DAY_END) {
      toast.error("End time must be within the calendar day.");
      return;
    }
    const total = durationFromTimeRange(startMinutes, endMinutes);
    if (!total || total < SLOT_MINUTES) {
      toast.error("Time block must be at least 30 minutes.");
      return;
    }

    start(async () => {
      if (isEdit) {
        const res = await updateTimeEntry(mode.entry.id, {
          minutes: total,
          startMinutes,
          description: note.trim() || undefined,
          billable,
        });
        if (res.ok) {
          toast.success("Entry updated");
          router.refresh();
          resetAndClose();
        } else toast.error(res.error);
      } else {
        const res = await logTime(ticketId, {
          minutes: total,
          startMinutes,
          workDate,
          description: note.trim() || undefined,
          billable,
        });
        if (res.ok) {
          toast.success("Time logged");
          router.refresh();
          resetAndClose();
        } else toast.error(res.error);
      }
    });
  }

  function remove() {
    if (!isEdit) return;
    start(async () => {
      const res = await deleteTimeEntry(mode.entry.id);
      if (res.ok) {
        toast.success("Entry deleted");
        router.refresh();
        resetAndClose();
      } else toast.error(res.error);
    });
  }

  const title =
    mode.kind === "edit"
      ? "Edit time block"
      : `Log time — ${format(new Date(workDate), "EEE, dd MMM")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!isEdit ? (
            <div className="space-y-1.5">
              <Label>Ticket</Label>
              <Combobox
                options={pickerOptions}
                value={ticketId}
                onChange={setTicketId}
                placeholder="Select ticket…"
                searchPlaceholder="Search tickets…"
                emptyText="No tickets found."
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              #{mode.entry.ticketNumber} · {mode.entry.ticketTitle}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="h-9"
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={billable} onCheckedChange={(v) => setBillable(v === true)} />
            Billable
          </label>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Save" : "Log time"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
