import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlatformLoginForm } from "./platform-login-form";

export default function PlatformLoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-16 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <ShieldCheck className="size-8" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Platform Admin</h1>
            <p className="text-sm text-muted-foreground">CA Firm Ops — firm provisioning console</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Super-admin access only.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlatformLoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
