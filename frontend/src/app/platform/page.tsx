import { redirect } from "next/navigation";
import { format } from "date-fns";
import { LogOut, ShieldCheck } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";
import { requirePlatformToken } from "@/lib/platform-session";
import { platformLogout } from "@/actions/platform";
import { CreateFirmDialog } from "@/components/platform/create-firm-dialog";
import { FirmActiveToggle } from "@/components/platform/firm-active-toggle";
import { ResetPasswordButton } from "@/components/platform/reset-password-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cafirmops.in";

type Firm = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  caEmail: string | null;
  _count: { users: number; clients: number; tickets: number };
};

async function getFirms(token: string): Promise<Firm[]> {
  const res = await fetch(`${BACKEND_URL}/api/platform/firms`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/platform/login");
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? "Failed to load firms");
  return json.data as Firm[];
}

export default async function PlatformDashboard() {
  const token = await requirePlatformToken();
  const firms = await getFirms(token);

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Platform Admin</h1>
            <p className="text-sm text-muted-foreground">Firm provisioning &amp; management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CreateFirmDialog />
          <form action={platformLogout}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firm</TableHead>
                <TableHead>Login URL</TableHead>
                <TableHead>CA email</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Password</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No firms yet. Click “Onboard new firm” to add your first client.
                  </TableCell>
                </TableRow>
              ) : (
                firms.map((f) => (
                  <TableRow key={f.id} className={f.isActive ? "" : "opacity-60"}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {f.slug}.{ROOT_DOMAIN}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.caEmail ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{f._count.users}</TableCell>
                    <TableCell className="text-right tabular-nums">{f._count.clients}</TableCell>
                    <TableCell className="text-right tabular-nums">{f._count.tickets}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(f.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-center">
                      <FirmActiveToggle id={f.id} isActive={f.isActive} firmName={f.name} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ResetPasswordButton
                        firmId={f.id}
                        firmName={f.name}
                        caEmail={f.caEmail}
                        loginUrl={`https://${f.slug}.${ROOT_DOMAIN}/login`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
