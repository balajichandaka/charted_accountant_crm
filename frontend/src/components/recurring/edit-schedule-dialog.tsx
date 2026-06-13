"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateSchedule } from "@/actions/recurring";
import { FREQUENCY_LABEL, RECURRING_FREQUENCIES } from "@/lib/labels";
import type { Frequency, ScheduleRow } from "./types";

const UNASSIGNED = "__unassigned__";

// Rendered fresh per schedule (keyed by id), so state initializes directly from
// the schedule's values — no effect-based reset needed.
function EditScheduleForm({
  schedule,
  employees,
  onClose,
}: {
  schedule: ScheduleRow;
  employees: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState<string>(schedule.assigneeId ?? UNASSIGNED);
  const [frequency, setFrequency] = useState<Frequency>(schedule.frequency);
  const [dayOfMonth, setDayOfMonth] = useState<string>(
    schedule.dayOfMonth != null ? String(schedule.dayOfMonth) : ""
  );
  const [dueOffsetDays, setDueOffsetDays] = useState<string>(String(schedule.dueOffsetDays));
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const res = await updateSchedule(schedule.id, {
      assigneeId: assigneeId === UNASSIGNED ? "" : assigneeId,
      frequency,
      dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
      dueOffsetDays: Number(dueOffsetDays),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Schedule updated");
      onClose();
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Assign to</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRING_FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {FREQUENCY_LABEL[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Day of month</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="e.g. 7"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Due offset (days)</Label>
          <Input
            type="number"
            min="0"
            max="90"
            value={dueOffsetDays}
            onChange={(e) => setDueOffsetDays(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditScheduleDialog({
  schedule,
  employees,
  open,
  onOpenChange,
}: {
  schedule: ScheduleRow | null;
  employees: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit schedule</DialogTitle>
          <DialogDescription>
            {schedule ? `${schedule.templateName} · ${schedule.clientName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {schedule ? (
          <EditScheduleForm
            key={schedule.id}
            schedule={schedule}
            employees={employees}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
