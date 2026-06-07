"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, Trash2, Play, Repeat } from "lucide-react";
import { toast } from "sonner";
import { recurringSchema, type RecurringFormValues } from "@/schemas/recurring";
import {
  createSchedule,
  setScheduleActive,
  deleteSchedule,
  runRecurringNow,
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

type Frequency = RecurringFormValues["frequency"];

export type ScheduleRow = {
  id: string;
  clientName: string;
  templateName: string;
  assigneeName: string | null;
  frequency: Frequency;
  nextRunAt: string | null;
  isActive: boolean;
};

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

function RunNowButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await runRecurringNow();
          if (res.ok && res.data) {
            toast.success(
              `Generated ${res.data.generated}, skipped ${res.data.skipped}`
            );
            router.refresh();
          } else if (!res.ok) toast.error(res.error);
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Play className="size-4" />
      )}
      Run generation now
    </Button>
  );
}

function Row({ s }: { s: ScheduleRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Repeat className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          {s.templateName}
          <Badge variant="outline">{FREQUENCY_LABEL[s.frequency]}</Badge>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {s.clientName}
          {s.assigneeName ? ` · ${s.assigneeName}` : " · Unassigned"}
          {s.nextRunAt ? ` · next ${s.nextRunAt}` : ""}
        </p>
      </div>
      <Switch
        checked={s.isActive}
        disabled={pending}
        onCheckedChange={(v) =>
          start(async () => {
            const res = await setScheduleActive(s.id, v);
            if (res.ok) router.refresh();
            else toast.error(res.error);
          })
        }
      />
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteSchedule(s.id);
            if (res.ok) {
              toast.success("Schedule deleted");
              router.refresh();
            } else toast.error(res.error);
          })
        }
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <RunNowButton />
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
            <Row key={s.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
