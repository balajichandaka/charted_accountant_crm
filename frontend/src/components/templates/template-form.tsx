"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blockEnterSubmit } from "@/lib/form";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { templateSchema, type TemplateFormValues } from "@/schemas/template";
import {
  createWorkTemplate,
  updateWorkTemplate,
} from "@/actions/templates";
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

type Category = { id: string; name: string };
type Frequency = TemplateFormValues["defaultFrequency"];

const FREQUENCIES = Object.keys(FREQUENCY_LABEL) as Frequency[];

export function TemplateForm({
  categories,
  template,
}: {
  categories: Category[];
  template?: {
    id: string;
    name: string;
    categoryId: string;
    description: string | null;
    documentsRequired: string | null;
    defaultFrequency: Frequency;
    defaultBillable: "BILLABLE" | "NON_BILLABLE";
    defaultPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    subtasks: { title: string }[];
  };
}) {
  const router = useRouter();
  const isEdit = Boolean(template);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name ?? "",
      categoryId: template?.categoryId ?? "",
      description: template?.description ?? "",
      documentsRequired: template?.documentsRequired ?? "",
      defaultFrequency: template?.defaultFrequency ?? "ONE_TIME",
      defaultBillable: template?.defaultBillable ?? "BILLABLE",
      defaultPriority: template?.defaultPriority ?? "MEDIUM",
      subtasks: template?.subtasks?.length
        ? template.subtasks.map((s) => ({ title: s.title }))
        : [{ title: "" }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "subtasks",
  });

  async function onSubmit(values: TemplateFormValues) {
    const res = isEdit
      ? await updateWorkTemplate(template!.id, values)
      : await createWorkTemplate(values);
    if (res.ok) {
      toast.success(isEdit ? "Template updated" : "Template created");
      if (isEdit) router.refresh();
      else router.push("/templates");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={blockEnterSubmit}
      className="grid gap-6 lg:grid-cols-5"
    >
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Task details</CardTitle>
          <CardDescription>
            The work definition that will prefill new tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Task name *</Label>
            <Input {...register("name")} placeholder="e.g. GST Monthly Filing" />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={watch("categoryId")}
                onValueChange={(v) => setValue("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId ? (
                <p className="text-xs text-destructive">
                  {errors.categoryId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Default frequency</Label>
              <Select
                value={watch("defaultFrequency")}
                onValueChange={(v) =>
                  setValue("defaultFrequency", v as Frequency)
                }
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
              <Label>Default priority</Label>
              <Select
                value={watch("defaultPriority")}
                onValueChange={(v) =>
                  setValue("defaultPriority", v as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
                }
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
              <Label>Billable</Label>
              <Select
                value={watch("defaultBillable")}
                onValueChange={(v) =>
                  setValue("defaultBillable", v as "BILLABLE" | "NON_BILLABLE")
                }
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
            <Textarea
              rows={2}
              {...register("documentsRequired")}
              placeholder="e.g. Sales register, Purchase register, Bank statement"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} {...register("description")} />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Sub-tasks</CardTitle>
          <CardDescription>
            Ordered checklist copied onto each ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-1.5">
              <GripVertical className="size-4 shrink-0 text-muted-foreground" />
              <Input
                {...register(`subtasks.${index}.title`)}
                placeholder={`Step ${index + 1}`}
              />
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
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
            </div>
          ))}
          {errors.subtasks?.message ? (
            <p className="text-xs text-destructive">{errors.subtasks.message}</p>
          ) : null}
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

      <div className="flex justify-end gap-2 lg:col-span-5">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/templates")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create template"}
        </Button>
      </div>
    </form>
  );
}
