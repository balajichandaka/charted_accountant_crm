"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blockEnterSubmit } from "@/lib/form";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { employeeSchema, type EmployeeFormValues } from "@/schemas/employee";
import {
  createEmployee,
  updateEmployee,
  setUserActive,
  deleteEmployee,
} from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

type Emp = {
  id: string;
  name: string;
  email: string;
  role: "CA" | "MANAGER" | "EMPLOYEE";
  isActive: boolean;
  openTickets: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function EmployeeDialog({
  employee,
  trigger,
}: {
  employee?: Emp;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(employee);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? "",
      email: employee?.email ?? "",
      role: employee?.role ?? "EMPLOYEE",
      password: "",
    },
  });

  async function onSubmit(values: EmployeeFormValues) {
    const res = isEdit
      ? await updateEmployee(employee!.id, values)
      : await createEmployee(values);
    if (res.ok) {
      toast.success(isEdit ? "User updated" : "User created");
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
          <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update details, role, or reset the password."
              : "Create a login for a team member."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="employee-form"
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={blockEnterSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={watch("role")}
              onValueChange={(v) => setValue("role", v as "CA" | "MANAGER" | "EMPLOYEE")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="CA">CA (Administrator)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? "New password (optional)" : "Password *"}</Label>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? "Leave blank to keep current" : ""}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteEmployeeButton({ emp, isSelf }: { emp: Emp; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive"
        disabled={isSelf}
        title={isSelf ? "You cannot delete your own account" : "Delete user"}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Delete {emp.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the user and their login. If they have logged time,
              created tickets, or left comments, the delete is blocked — deactivate them
              instead to keep those records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteEmployee(emp.id);
                  if (res.ok) {
                    toast.success("User deleted");
                    setOpen(false);
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
    </>
  );
}

function ActiveToggle({ emp }: { emp: Emp }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={emp.isActive}
      disabled={pending}
      onCheckedChange={(v) =>
        startTransition(async () => {
          const res = await setUserActive(emp.id, v);
          if (res.ok) router.refresh();
          else toast.error(res.error);
        })
      }
    />
  );
}

export function EmployeeManager({
  employees,
  currentUserId,
}: {
  employees: Emp[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <EmployeeDialog
          trigger={
            <Button>
              <Plus className="size-4" />
              New user
            </Button>
          }
        />
      </div>
      <ul className="divide-y rounded-lg border">
        {employees.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(e.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                {e.name}
                <Badge variant={e.role === "CA" ? "default" : e.role === "MANAGER" ? "outline" : "secondary"}>
                  {e.role === "CA" ? "CA" : e.role === "MANAGER" ? "Manager" : "Employee"}
                </Badge>
                {!e.isActive ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{e.email}</p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:inline tabular">
              {e.openTickets} open
            </span>
            <EmployeeDialog
              employee={e}
              trigger={
                <Button variant="ghost" size="icon">
                  <Pencil className="size-4" />
                </Button>
              }
            />
            <DeleteEmployeeButton emp={e} isSelf={e.id === currentUserId} />
            <ActiveToggle emp={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}
