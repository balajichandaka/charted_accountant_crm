import { Landmark } from "lucide-react";
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
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">CA Practice</h1>
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

        <p className="text-center text-xs text-muted-foreground">
          Demo: ca@firm.test · priya@firm.test · rahul@firm.test —
          password123
        </p>
      </div>
    </div>
  );
}
