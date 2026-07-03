"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function PasswordToggle({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const toggle = (key: "current" | "next" | "confirm") =>
    setShow((s) => ({ ...s, [key]: !s[key] }));

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (res.ok) {
      toast.success("Password changed");
      reset();
      onOpenChange(false);
    } else {
      setServerError(res.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          setServerError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password and a new one.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={show.current ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
                {...register("currentPassword", { required: "Enter your current password." })}
              />
              <PasswordToggle shown={show.current} onClick={() => toggle("current")} />
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={show.next ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...register("newPassword", {
                  required: "Enter a new password.",
                  minLength: { value: 8, message: "At least 8 characters." },
                })}
              />
              <PasswordToggle shown={show.next} onClick={() => toggle("next")} />
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={show.confirm ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...register("confirmPassword", {
                  validate: (v) => v === watch("newPassword") || "Passwords do not match.",
                })}
              />
              <PasswordToggle shown={show.confirm} onClick={() => toggle("confirm")} />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
