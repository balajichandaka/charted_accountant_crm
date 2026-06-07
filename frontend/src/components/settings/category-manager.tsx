"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { categorySchema, type CategoryInput } from "@/schemas/category";
import {
  createCategory,
  updateCategory,
  setCategoryActive,
} from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Cat = {
  id: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  isActive: boolean;
  count: number;
};

function CategoryDialog({
  category,
  trigger,
}: {
  category?: Cat;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(category);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      colorHex: category?.colorHex ?? "#2563eb",
    },
  });

  async function onSubmit(values: CategoryInput) {
    const res = isEdit
      ? await updateCategory(category!.id, values)
      : await createCategory(values);
    if (res.ok) {
      toast.success(isEdit ? "Category updated" : "Category added");
      setOpen(false);
      if (!isEdit) reset();
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name")} placeholder="GST" />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input {...register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <Input type="color" {...register("colorHex")} className="h-10 w-20 p-1" />
            {errors.colorHex ? (
              <p className="text-xs text-destructive">
                {errors.colorHex.message}
              </p>
            ) : null}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ cat }: { cat: Cat }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={cat.isActive}
      disabled={pending}
      onCheckedChange={(v) =>
        startTransition(async () => {
          const res = await setCategoryActive(cat.id, v);
          if (res.ok) router.refresh();
          else toast.error(res.error);
        })
      }
    />
  );
}

export function CategoryManager({ categories }: { categories: Cat[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} categories of work
        </p>
        <CategoryDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              New category
            </Button>
          }
        />
      </div>
      <ul className="divide-y rounded-lg border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: c.colorHex ?? "#64748b" }}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                {c.name}
                {!c.isActive ? (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                ) : null}
              </p>
              {c.description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {c.description}
                </p>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground tabular">
              {c.count} tickets
            </span>
            <CategoryDialog
              category={c}
              trigger={
                <Button variant="ghost" size="icon">
                  <Pencil className="size-4" />
                </Button>
              }
            />
            <Toggle cat={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
