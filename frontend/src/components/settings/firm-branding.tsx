"use client";

import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateFirm } from "@/actions/firm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blockEnterSubmit } from "@/lib/form";

export type FirmProfile = {
  name: string;
  slug: string;
  brandName: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  escalationName: string | null;
  escalationEmail: string | null;
  escalationPhone: string | null;
  emailFromName: string | null;
};

type FormValues = {
  brandName: string;
  logoUrl: string;
  emailFromName: string;
  contactEmail: string;
  contactPhone: string;
  escalationName: string;
  escalationEmail: string;
  escalationPhone: string;
};

const FIELDS: { key: keyof FormValues; label: string; type?: string }[] = [
  { key: "brandName", label: "Brand name" },
  { key: "logoUrl", label: "Logo URL" },
  { key: "emailFromName", label: "Email sender name" },
  { key: "contactEmail", label: "Contact email", type: "email" },
  { key: "contactPhone", label: "Contact phone" },
  { key: "escalationName", label: "Escalation name" },
  { key: "escalationEmail", label: "Escalation email", type: "email" },
  { key: "escalationPhone", label: "Escalation phone" },
];

export function FirmBranding({ firm }: { firm: FirmProfile }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      brandName: firm.brandName ?? "",
      logoUrl: firm.logoUrl ?? "",
      emailFromName: firm.emailFromName ?? "",
      contactEmail: firm.contactEmail ?? "",
      contactPhone: firm.contactPhone ?? "",
      escalationName: firm.escalationName ?? "",
      escalationEmail: firm.escalationEmail ?? "",
      escalationPhone: firm.escalationPhone ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const res = await updateFirm(values);
    if (res.ok) toast.success("Firm settings saved");
    else toast.error(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={blockEnterSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Public address: <span className="font-mono">{firm.slug}.cafirmops.in</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs" htmlFor={f.key}>
              {f.label}
            </Label>
            <Input id={f.key} type={f.type ?? "text"} {...register(f.key)} />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save firm settings
      </Button>
    </form>
  );
}
