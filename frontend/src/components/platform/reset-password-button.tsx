"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { resetCaPassword } from "@/actions/platform";
import { generatePassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CredentialsPanel } from "./credentials-panel";

export function ResetPasswordButton({
  firmId,
  firmName,
  caEmail,
  loginUrl,
}: {
  firmId: string;
  firmName: string;
  caEmail: string | null;
  loginUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [proposed, setProposed] = useState("");
  const [applied, setApplied] = useState<{ email: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setApplied(null);
    setProposed(generatePassword());
    setOpen(true);
  }

  function apply() {
    startTransition(async () => {
      const res = await resetCaPassword(firmId, proposed);
      if (res.ok && res.data) {
        setApplied(res.data);
        toast.success("Password updated");
      } else {
        toast.error(res.ok ? "No data returned." : res.error);
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={start}
        aria-label={`Reset password for ${firmName}`}
      >
        <KeyRound className="size-4" />
        Reset password
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), setApplied(null)))}>
        <DialogContent className="sm:max-w-md">
          {applied ? (
            <>
              <DialogHeader>
                <DialogTitle>Password updated for {firmName}</DialogTitle>
                <DialogDescription>Copy and share these with the firm&apos;s CA.</DialogDescription>
              </DialogHeader>
              <CredentialsPanel url={loginUrl} email={applied.email} password={applied.password} />
              <DialogFooter>
                <Button
                  onClick={() => {
                    setOpen(false);
                    setApplied(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reset password for {firmName}</DialogTitle>
                <DialogDescription>
                  Review the new password below, then confirm to apply it. Nothing changes until you
                  click Apply.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">CA email</p>
                  <p className="font-mono">{caEmail ?? "—"}</p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Current password</p>
                  <p className="text-sm text-muted-foreground">
                    Not viewable — stored encrypted. Resetting replaces it.
                  </p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">New password</p>
                      <p className="font-mono text-sm">{proposed}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setProposed(generatePassword())}>
                      <RefreshCw className="size-4" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={apply} disabled={pending}>
                  {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Apply new password
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
