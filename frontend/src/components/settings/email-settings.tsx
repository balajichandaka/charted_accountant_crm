"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Eye, EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { updateFirm, sendTestEmail } from "@/actions/firm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blockEnterSubmit } from "@/lib/form";

export type FirmEmailSettings = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpConfigured: boolean;
};

type FormValues = {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpFrom: string;
  smtpPass: string;
};

export function EmailSettings({ firm }: { firm: FirmEmailSettings }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      smtpHost: firm.smtpHost ?? "smtp.gmail.com",
      smtpPort: String(firm.smtpPort ?? 587),
      smtpUser: firm.smtpUser ?? "",
      smtpFrom: firm.smtpFrom ?? "",
      smtpPass: "",
    },
  });
  const [showPass, setShowPass] = useState(false);
  const [configured, setConfigured] = useState(firm.smtpConfigured);
  const [testing, startTest] = useTransition();

  async function onSubmit(values: FormValues) {
    const port = Number(values.smtpPort) || 587;
    const payload: Record<string, unknown> = {
      smtpHost: values.smtpHost.trim(),
      smtpPort: port,
      // SSL is implied by the port (465 = SSL, otherwise STARTTLS) — the server
      // enforces this too, so the two can never mismatch.
      smtpSecure: port === 465,
      smtpUser: values.smtpUser.trim(),
      smtpFrom: values.smtpFrom.trim(),
    };
    // Only send the password when the CA typed a new one; blank keeps the existing.
    if (values.smtpPass.length > 0) payload.smtpPass = values.smtpPass;

    const res = await updateFirm(payload);
    if (res.ok) {
      toast.success("Email settings saved");
      if (values.smtpPass.length > 0) setConfigured(true);
    } else {
      toast.error(res.error);
    }
  }

  function runTest() {
    startTest(async () => {
      const res = await sendTestEmail();
      if (res.ok) toast.success(`Test email sent to ${res.data?.to ?? "you"}`);
      else toast.error(res.error);
    });
  }

  async function clearCreds() {
    const res = await updateFirm({ smtpClear: true });
    if (res.ok) {
      toast.success("Email credentials removed");
      setConfigured(false);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={blockEnterSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Send notification emails from your own mailbox. Use a{" "}
        <span className="font-medium">Gmail/Outlook app password</span>, not your login password.
        Leave blank to keep using the platform default sender.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="smtpHost">SMTP host</Label>
          <Input id="smtpHost" placeholder="smtp.gmail.com" {...register("smtpHost")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="smtpPort">Port</Label>
          <Input id="smtpPort" type="number" placeholder="587" {...register("smtpPort")} />
          <p className="text-[11px] text-muted-foreground">
            Use <span className="font-mono">587</span> (recommended, STARTTLS) or{" "}
            <span className="font-mono">465</span> (SSL). SSL is set automatically from the port.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="smtpUser">SMTP username (email)</Label>
          <Input id="smtpUser" type="email" placeholder="you@yourfirm.com" {...register("smtpUser")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="smtpFrom">From address (optional)</Label>
          <Input
            id="smtpFrom"
            placeholder='"Your Firm" <you@yourfirm.com>'
            {...register("smtpFrom")}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="smtpPass">App password</Label>
          <div className="relative">
            <Input
              id="smtpPass"
              type={showPass ? "text" : "password"}
              autoComplete="off"
              className="pr-10"
              placeholder={configured ? "•••••••• (saved — leave blank to keep)" : ""}
              {...register("smtpPass")}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save email settings
        </Button>
        <Button type="button" variant="outline" onClick={runTest} disabled={testing || !configured}>
          {testing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
          Send test email
        </Button>
        {configured && (
          <Button type="button" variant="ghost" onClick={clearCreds}>
            Remove credentials
          </Button>
        )}
      </div>
    </form>
  );
}
