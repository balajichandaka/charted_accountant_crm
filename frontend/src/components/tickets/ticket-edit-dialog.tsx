"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Loader2 } from "lucide-react";
import { blockEnterSubmit } from "@/lib/form";
import { toast } from "sonner";
import {
  updateTicketSchema,
  type UpdateTicketFormValues,
} from "@/schemas/ticket";
import { updateTicket } from "@/actions/tickets";
import {
  FREQUENCY_LABEL,
  PRIORITY_LABEL,
  BILLABLE_LABEL,
  INVOICE_NOTE_LABEL,
  PRIORITY_ORDER,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Frequency = UpdateTicketFormValues["frequency"];
type Priority = UpdateTicketFormValues["priority"];
type Billable = UpdateTicketFormValues["billable"];
type InvoiceNote = UpdateTicketFormValues["invoiceStatus"];

const FREQUENCIES = Object.keys(FREQUENCY_LABEL) as Frequency[];
const INVOICE_NOTES = Object.keys(INVOICE_NOTE_LABEL) as InvoiceNote[];

export function TicketEditDialog({
  ticket,
  categories,
  employees,
  managers,
}: {
  ticket: {
    id: string;
    title: string;
    categoryId: string;
    assigneeId: string;
    managerId: string;
    priority: Priority;
    frequency: Frequency;
    billable: Billable;
    invoiceStatus: InvoiceNote;
    targetHours: number | undefined;
    description: string;
    documentsRequired: string;
    startDate: string;
    dueDate: string;
  };
  categories: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  managers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const UNASSIGNED = "__unassigned__";
  const NOCAT = "__none__";
  const NOMGR = "__nomgr__";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTicketFormValues>({
    resolver: zodResolver(updateTicketSchema),
    defaultValues: { ...ticket },
  });

  async function onSubmit(values: UpdateTicketFormValues) {
    const res = await updateTicket(ticket.id, values);
    if (res.ok) {
      toast.success("Ticket updated");
      setOpen(false);
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit ticket</DialogTitle>
        </DialogHeader>
        <form
          id="ticket-edit"
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={blockEnterSubmit}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title *</Label>
            <Input {...register("title")} />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={watch("categoryId") || NOCAT}
              onValueChange={(v) => setValue("categoryId", v === NOCAT ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOCAT}>None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={watch("assigneeId") || UNASSIGNED}
              onValueChange={(v) =>
                setValue("assigneeId", v === UNASSIGNED ? "" : v)
              }
            >
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
            <Label>Manager</Label>
            <Select
              value={watch("managerId") || NOMGR}
              onValueChange={(v) => setValue("managerId", v === NOMGR ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOMGR}>No manager</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Target hours</Label>
            <Input type="number" min="0" step="0.5" {...register("targetHours")} />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={watch("priority")}
              onValueChange={(v) => setValue("priority", v as Priority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL[p]}
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
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Billable</Label>
            <Select
              value={watch("billable")}
              onValueChange={(v) => setValue("billable", v as Billable)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BILLABLE">{BILLABLE_LABEL.BILLABLE}</SelectItem>
                <SelectItem value="NON_BILLABLE">
                  {BILLABLE_LABEL.NON_BILLABLE}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Invoice status</Label>
            <Select
              value={watch("invoiceStatus")}
              onValueChange={(v) => setValue("invoiceStatus", v as InvoiceNote)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_NOTES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {INVOICE_NOTE_LABEL[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" {...register("startDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" min={watch("startDate") || undefined} {...register("dueDate")} />
            {errors.dueDate ? (
              <p className="text-xs text-destructive">{errors.dueDate.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Documents required</Label>
            <Textarea rows={2} {...register("documentsRequired")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} {...register("description")} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="ticket-edit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
