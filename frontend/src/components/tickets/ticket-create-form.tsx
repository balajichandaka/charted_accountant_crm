"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createTicketSchema,
  type CreateTicketFormValues,
} from "@/schemas/ticket";
import { createTicket } from "@/actions/tickets";
import {
  FREQUENCY_LABEL,
  PRIORITY_LABEL,
  BILLABLE_LABEL,
  PRIORITY_ORDER,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Frequency = CreateTicketFormValues["frequency"];
type Priority = CreateTicketFormValues["priority"];
type Billable = CreateTicketFormValues["billable"];

export type TemplateOption = {
  id: string;
  name: string;
  categoryId: string;
  documentsRequired: string | null;
  defaultFrequency: Frequency;
  defaultBillable: Billable;
  defaultPriority: Priority;
  subtasks: { title: string }[];
};

const FREQUENCIES = Object.keys(FREQUENCY_LABEL) as Frequency[];

export function TicketCreateForm({
  categories,
  templates,
  clients,
  employees,
  managers,
}: {
  categories: { id: string; name: string }[];
  templates: TemplateOption[];
  clients: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  managers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      clientId: "",
      templateId: "",
      categoryId: "",
      assigneeId: "",
      managerId: "",
      priority: "MEDIUM",
      frequency: "ONE_TIME",
      billable: "BILLABLE",
      targetHours: undefined,
      description: "",
      documentsRequired: "",
      startDate: "",
      dueDate: "",
      subtasks: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "subtasks",
  });

  const selectedTemplateId = watch("templateId");
  const selectedCategory = watch("categoryId");

  const visibleTemplates = selectedCategory
    ? templates.filter((t) => t.categoryId === selectedCategory)
    : templates;

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    setValue("templateId", id);
    if (!t) return;
    setValue("title", t.name);
    setValue("categoryId", t.categoryId);
    setValue("documentsRequired", t.documentsRequired ?? "");
    setValue("frequency", t.defaultFrequency);
    setValue("billable", t.defaultBillable);
    setValue("priority", t.defaultPriority);
    replace(t.subtasks.map((s) => ({ title: s.title })));
  }

  async function onSubmit(values: CreateTicketFormValues) {
    const res = await createTicket(values);
    if (res.ok && res.data) {
      toast.success("Ticket created");
      router.push(`/tickets/${res.data.id}`);
    } else if (!res.ok) {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Start from a template
            </CardTitle>
            <CardDescription>
              Pick a work template to prefill the fields and sub-task checklist.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={selectedCategory || undefined}
                onValueChange={(v) => setValue("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Work template</Label>
              <Select
                value={selectedTemplateId || undefined}
                onValueChange={applyTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Blank ticket" />
                </SelectTrigger>
                <SelectContent>
                  {visibleTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input {...register("title")} />
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  <p className="text-xs text-destructive">
                    {errors.clientId.message}
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
                <Label>Manager</Label>
                <Select
                  value={watch("managerId") || undefined}
                  onValueChange={(v) => setValue("managerId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No manager" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 8"
                  {...register("targetHours")}
                />
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
                <Label>Start date</Label>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" {...register("dueDate")} />
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
                    <SelectItem value="BILLABLE">
                      {BILLABLE_LABEL.BILLABLE}
                    </SelectItem>
                    <SelectItem value="NON_BILLABLE">
                      {BILLABLE_LABEL.NON_BILLABLE}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Documents required</Label>
              <Textarea rows={2} {...register("documentsRequired")} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} {...register("description")} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Sub-tasks</CardTitle>
            <CardDescription>
              Checklist for this ticket (prefilled from the template).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sub-tasks. Add some or pick a template.
              </p>
            ) : (
              fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-1.5">
                  <Input
                    {...register(`subtasks.${index}.title`)}
                    placeholder={`Step ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => append({ title: "" })}
            >
              <Plus className="size-4" />
              Add sub-task
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/tickets")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Create ticket
          </Button>
        </div>
      </div>
    </form>
  );
}
