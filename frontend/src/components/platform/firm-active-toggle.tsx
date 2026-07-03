"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setFirmActive } from "@/actions/platform";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FirmActiveToggle({
  id,
  isActive,
  firmName,
}: {
  id: string;
  isActive: boolean;
  firmName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The value the switch was flipped toward, pending confirmation.
  const [nextValue, setNextValue] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  const suspending = nextValue === false;
  const label = firmName ? ` "${firmName}"` : " this firm";

  function confirm() {
    if (nextValue === null) return;
    const value = nextValue;
    startTransition(async () => {
      const res = await setFirmActive(id, value);
      if (res.ok) {
        toast.success(value ? "Firm activated" : "Firm suspended");
        setOpen(false);
        setNextValue(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <Switch
        checked={isActive}
        disabled={pending}
        onCheckedChange={(next) => {
          setNextValue(next);
          setOpen(true);
        }}
        aria-label={isActive ? "Suspend firm" : "Activate firm"}
      />

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o && !pending) {
            setOpen(false);
            setNextValue(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {suspending ? `Suspend${label}?` : `Activate${label}?`}
            </DialogTitle>
            <DialogDescription>
              {suspending ? (
                <>
                  All users of this firm will be <strong>blocked from logging in</strong>{" "}
                  immediately. No data is deleted — every ticket, client and record is
                  retained and restored the moment you re-activate the firm.
                </>
              ) : (
                <>
                  This firm&apos;s users will be able to <strong>log in again</strong> and
                  resume using the app. All previously retained data becomes available.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setNextValue(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant={suspending ? "destructive" : "default"}
              onClick={confirm}
              disabled={pending}
            >
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {suspending ? "Suspend firm" : "Activate firm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
