"use client";

import { useState } from "react";
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
import { createCategory } from "@/actions/categories";
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
import { Checkbox } from "@/components/ui/checkbox";
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

  const [categoryList, setCategoryList] = useState(categories);
  const [creatingCategory, setCreatingCategory] = useState(categories.length === 0);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [categoryPending, setCategoryPending] = useState(false);
  const [categoryError, setCategoryError] = useState<string | undefined>();

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

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Category name is required");
      return;
    }
    setCategoryPending(true);
    setCategoryError(undefined);
    const res = await createCategory({ name, isActive: saveForFuture });
    setCategoryPending(false);
    if (!res.ok) {
      setCategoryError(res.error);
      return;
    }
    const created = res.data!;
    setCategoryList((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    setValue("categoryId", created.id, { shouldValidate: true });
    setNewCategoryName("");
    setSaveForFuture(true);
    setCreatingCategory(false);
  }

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
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Category *</Label>
              {creatingCategory ? (
                <div className="space-y-2 rounded-md border border-dashed p-3">
                  <Input
                    autoFocus
                    placeholder="e.g. GST"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={categoryPending}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="save-category-for-future"
                      checked={saveForFuture}
                      onCheckedChange={(v) => setSaveForFuture(v === true)}
                      disabled={categoryPending}
                    />
                    <Label
                      htmlFor="save-category-for-future"
                      className="text-xs font-normal text-muted-foreground"
                    >
                      Save this category for future templates
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uncheck to use it just for this template — it won&apos;t be suggested next time.
                  </p>
                  {categoryError ? (
                    <p className="text-xs text-destructive">{categoryError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={categoryPending}
                      onClick={handleCreateCategory}
                    >
                      {categoryPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Add category
                    </Button>
                    {categoryList.length > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={categoryPending}
                        onClick={() => {
                          setCreatingCategory(false);
                          setCategoryError(undefined);
                          setNewCategoryName("");
                        }}
                      >
                        Choose existing
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={watch("categoryId")}
                    onValueChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatingCategory(true)}
                  >
                    <Plus className="size-4" />
                    New category
                  </Button>
                </div>
              )}
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
