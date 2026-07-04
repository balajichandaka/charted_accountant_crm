"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blockEnterSubmit } from "@/lib/form";
import { format } from "date-fns";
import { Plus, Loader2, Trash2, Repeat, Pencil } from "lucide-react";
import { toast } from "sonner";
import { recurringSchema, type RecurringFormValues } from "@/schemas/recurring";
import {
  createSchedule,
  setScheduleActive,
  deleteSchedule,
} from "@/actions/recurring";
import { FREQUENCY_LABEL, RECURRING_FREQUENCIES } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScheduleDetailDialog } from "./schedule-detail-dialog";
import { EditScheduleDialog } from "./edit-schedule-dialog";
import type { ScheduleRow } from "./types";

type Frequency = RecurringFormValues["frequency"];

function fmtNext(iso: string) {
  return format(new Date(iso), "dd MMM yyyy");
}

function NewScheduleDialog({
  clients,
  templates,
  employees,
}: {
  clients: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      clientId: "",
      templateId: "",
      assigneeId: "",
      frequency: "MONTHLY",
      dueOffsetDays: 7,
      firstRunDate: "",
    },
  });

  async function onSubmit(values: RecurringFormValues) {
    const res = await createSchedule(values);
    if (res.ok) {
      toast.success("Recurring schedule created");
      setOpen(false);
      reset();
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New recurring schedule</DialogTitle>
          <DialogDescription>
            Auto-generate a ticket from a template for a client each period.
          </DialogDescription>
        </DialogHeader>
        <form
          id="schedule-form"
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={blockEnterSubmit}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select
              value={watch("clientId") || undefined}
              onValueChange={(v) => setValue("clientId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId ? (
              <p className="text-xs text-destructive">{errors.clientId.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Template *</Label>
            <Select
              value={watch("templateId") || undefined}
              onValueChange={(v) => setValue("templateId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.templateId ? (
              <p className="text-xs text-destructive">
                {errors.templateId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select
              value={watch("assigneeId") || undefined}
              onValueChange={(v) => setValue("assigneeId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
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
            <Select
              value={watch("frequency")}
              onValueChange={(v) => setValue("frequency", v as Frequency)}
            >
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
            <Label>First run date *</Label>
            <Input type="date" {...register("firstRunDate")} />
            {errors.firstRunDate ? (
              <p className="text-xs text-destructive">
                {errors.firstRunDate.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Due offset (days)</Label>
            <Input type="number" {...register("dueOffsetDays")} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  schedule,
  open,
  onOpenChange,
}: {
  schedule: ScheduleRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Delete schedule permanently?</DialogTitle>
          <DialogDescription>
            {schedule
              ? `This permanently deletes the ${FREQUENCY_LABEL[schedule.frequency]} “${schedule.templateName}” schedule for ${schedule.clientName}. Tickets it already generated are kept. This cannot be undone.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              schedule &&
              start(async () => {
                const res = await deleteSchedule(schedule.id);
                if (res.ok) {
                  toast.success("Schedule deleted");
                  onOpenChange(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  s,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  s: ScheduleRow;
  onOpenDetail: (s: ScheduleRow) => void;
  onEdit: (s: ScheduleRow) => void;
  onDelete: (s: ScheduleRow) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center gap-1 px-2 py-1">
      <button
        type="button"
        onClick={() => onOpenDetail(s)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <Repeat className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{s.templateName}</span>
            <Badge variant="outline">{FREQUENCY_LABEL[s.frequency]}</Badge>
            {!s.isActive ? <Badge variant="outline">Paused</Badge> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {s.clientName}
            {s.assigneeName ? ` · ${s.assigneeName}` : " · Unassigned"}
            {s.nextRunAt ? ` · next ${fmtNext(s.nextRunAt)}` : ""}
          </p>
        </div>
      </button>

      <Switch
        checked={s.isActive}
        disabled={pending}
        aria-label={s.isActive ? "Pause schedule" : "Resume schedule"}
        onCheckedChange={(v) =>
          start(async () => {
            const res = await setScheduleActive(s.id, v);
            if (res.ok) router.refresh();
            else toast.error(res.error);
          })
        }
      />
      <Button variant="ghost" size="icon" aria-label="Edit schedule" onClick={() => onEdit(s)}>
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive"
        aria-label="Delete schedule"
        onClick={() => onDelete(s)}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

export function RecurringManager({
  schedules,
  clients,
  templates,
  employees,
}: {
  schedules: ScheduleRow[];
  clients: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}) {
  const [detailRow, setDetailRow] = useState<ScheduleRow | null>(null);
  const [editRow, setEditRow] = useState<ScheduleRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ScheduleRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <NewScheduleDialog
          clients={clients}
          templates={templates}
          employees={employees}
        />
      </div>
      {schedules.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring schedules"
          description="Create schedules for periodic work like monthly GST filing."
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {schedules.map((s) => (
            <Row
              key={s.id}
              s={s}
              onOpenDetail={setDetailRow}
              onEdit={setEditRow}
              onDelete={setDeleteRow}
            />
          ))}
        </ul>
      )}

      <ScheduleDetailDialog
        schedule={detailRow}
        open={!!detailRow}
        onOpenChange={(o) => !o && setDetailRow(null)}
      />
      <EditScheduleDialog
        schedule={editRow}
        employees={employees}
        open={!!editRow}
        onOpenChange={(o) => !o && setEditRow(null)}
      />
      <DeleteConfirmDialog
        schedule={deleteRow}
        open={!!deleteRow}
        onOpenChange={(o) => !o && setDeleteRow(null)}
      />
    </div>
  );
}
