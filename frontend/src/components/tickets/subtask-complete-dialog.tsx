"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logTime } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  timeInputToMinutes,
  durationFromTimeRange,
  SLOT_MINUTES,
} from "@/components/timesheet/calendar-utils";

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export function SubtaskCompleteDialog({
  ticketId,
  subtaskId,
  subtaskTitle,
  open,
  onLogged,
  onCancel,
}: {
  ticketId: string;
  subtaskId: string;
  subtaskTitle: string;
  open: boolean;
  onLogged: () => void;
  onCancel: () => void;
}) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [workDate, setWorkDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();

  function reset() {
    setStartTime("09:00");
    setEndTime("10:00");
    setWorkDate(todayStr());
    setDescription("");
  }

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
        subtaskId,
      });
      if (res.ok) {
        toast.success("Time logged");
        reset();
        onLogged();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log time to complete</DialogTitle>
          <DialogDescription>
            Log the time you spent on &ldquo;{subtaskTitle}&rdquo; before marking it done.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
              <Input
                type="date"
                max={todayStr()}
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onCancel();
            }}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Log time &amp; complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
