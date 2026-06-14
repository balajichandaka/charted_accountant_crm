import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="size-16 overflow-hidden rounded-xl shadow-sm">
            <Image
              src="/logo-blue.png"
              alt="CA Firm Ops"
              width={64}
              height={64}
              className="size-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">CA Firm Ops</h1>
            <p className="text-sm text-muted-foreground">
              Work management for your accounting firm
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your firm credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
