"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  clientSchema,
  type ClientInput,
  type ClientFormValues,
} from "@/schemas/client";
import { createClient, updateClient } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClientLike = Partial<ClientInput> & { id?: string };

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ClientFormDialog({
  client,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onCreated,
}: {
  client?: ClientLike;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  onCreated?: (created: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = Boolean(client?.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? "",
      companyName: client?.companyName ?? "",
      gstNumber: client?.gstNumber ?? "",
      billTo: client?.billTo ?? "",
      shipTo: client?.shipTo ?? "",
      rcm: client?.rcm ?? false,
      creditPeriodDays: client?.creditPeriodDays ?? undefined,
      state: client?.state ?? "",
      fullAddress: client?.fullAddress ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      notes: client?.notes ?? "",
    },
  });

  async function onSubmit(values: ClientFormValues) {
    const res = isEdit
      ? await updateClient(client!.id!, values)
      : await createClient(values);
    if (res.ok) {
      toast.success(isEdit ? "Client updated" : "Client created");
      setOpen(false);
      if (!isEdit) {
        reset();
        if (res.data?.id) {
          onCreated?.({ id: res.data.id, name: values.name });
        }
      }
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            Client master details (used across tickets and recurring work).
          </DialogDescription>
        </DialogHeader>

        <form
          id="client-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Client name *" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Acme Traders Pvt Ltd" />
          </Field>
          <Field label="Company name" error={errors.companyName?.message}>
            <Input {...register("companyName")} />
          </Field>
          <Field label="GST number" error={errors.gstNumber?.message}>
            <Input {...register("gstNumber")} placeholder="29AABCA1234F1Z5" />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Input {...register("state")} placeholder="Karnataka" />
          </Field>
          <Field label="Bill to" error={errors.billTo?.message}>
            <Input {...register("billTo")} />
          </Field>
          <Field label="Ship to" error={errors.shipTo?.message}>
            <Input {...register("shipTo")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input {...register("email")} type="email" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>
          <Field
            label="Credit period (days)"
            error={errors.creditPeriodDays?.message}
          >
            <Input
              type="number"
              {...register("creditPeriodDays")}
              placeholder="30"
            />
          </Field>
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id="rcm"
              checked={watch("rcm")}
              onCheckedChange={(v) => setValue("rcm", Boolean(v))}
            />
            <Label htmlFor="rcm" className="text-sm">
              RCM applicable
            </Label>
          </div>
          <div className="sm:col-span-2">
            <Field label="Full address" error={errors.fullAddress?.message}>
              <Textarea rows={2} {...register("fullAddress")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes" error={errors.notes?.message}>
              <Textarea rows={2} {...register("notes")} />
            </Field>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="client-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
