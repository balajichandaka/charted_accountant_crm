"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createFirm } from "@/actions/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blockEnterSubmit } from "@/lib/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CredentialsPanel } from "./credentials-panel";

type FormValues = {
  firmName: string;
  slug: string;
  caName: string;
  caEmail: string;
  caPassword: string;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cafirmops.in";

function randomPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

type CreatedInfo = { name: string; url: string; email: string; password: string };

export function CreateFirmDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CreatedInfo | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { firmName: "", slug: "", caName: "", caEmail: "", caPassword: "" },
  });

  const slug = watch("slug");

  function closeAll() {
    reset();
    setCreated(null);
    setOpen(false);
    router.refresh();
  }

  async function onSubmit(values: FormValues) {
    const res = await createFirm(values);
    if (res.ok) {
      toast.success(`Firm "${values.firmName}" onboarded`);
      setCreated({
        name: values.firmName,
        url: `https://${values.slug.trim().toLowerCase()}.${ROOT_DOMAIN}/login`,
        email: values.caEmail.trim(),
        password: values.caPassword,
      });
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeAll();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Onboard new firm
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{created.name} is ready</DialogTitle>
              <DialogDescription>
                Copy the login details and share them with the firm&apos;s CA.
              </DialogDescription>
            </DialogHeader>
            <CredentialsPanel url={created.url} email={created.email} password={created.password} />
            <DialogFooter>
              <Button onClick={closeAll}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Onboard a new firm</DialogTitle>
              <DialogDescription>
                Creates the firm and its first CA (admin) account. The firm goes live immediately.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} onKeyDown={blockEnterSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="firmName">Firm name</Label>
            <Input id="firmName" placeholder="Sharma & Co Chartered Accountants" {...register("firmName", { required: true })} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Subdomain</Label>
            <Input id="slug" placeholder="sharmaco" {...register("slug", { required: true })} />
            <p className="text-xs text-muted-foreground">
              Login URL: <span className="font-mono">{(slug || "your-firm").toLowerCase()}.{ROOT_DOMAIN}</span> ·
              lowercase letters/digits/hyphens, not www/app/admin/api.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="caName">First CA — name</Label>
              <Input id="caName" placeholder="Anita Sharma" {...register("caName", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caEmail">First CA — email</Label>
              <Input id="caEmail" type="email" placeholder="anita@sharmaco.com" {...register("caEmail", { required: true })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caPassword">Temporary password</Label>
            <div className="flex gap-2">
              <Input id="caPassword" placeholder="min 8 characters" {...register("caPassword", { required: true, minLength: 8 })} />
              <Button
                type="button"
                variant="outline"
                onClick={() => setValue("caPassword", randomPassword(), { shouldValidate: true })}
              >
                <RefreshCw className="size-4" />
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Share with the CA; they change it after first login.</p>
          </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create firm
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
