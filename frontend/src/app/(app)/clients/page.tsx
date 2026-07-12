import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { NewClientButton } from "@/components/clients/client-buttons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Client = {
  id: string;
  name: string;
  email: string | null;
  gstNumber: string | null;
  state: string | null;
  isActive: boolean;
  _count: { tickets: number };
};

export default async function ClientsPage() {
  await requireUser();
  const token = await getToken();

  const clients = await apiGet<Client[]>("/api/clients", token);

  return (
    <>
      <PageHeader
        title="Clients"
        description="Your firm's client master records."
      >
        <NewClientButton />
      </PageHeader>

      {clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Add your first client to start assigning work."
        >
          <NewClientButton />
        </EmptyState>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">GST Number</TableHead>
                <TableHead className="hidden lg:table-cell">State</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Link
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Building2 className="size-4" />
                      </span>
                      <span>
                        <span className="flex items-center gap-2 font-medium">
                          {c.name}
                          {!c.isActive ? (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          ) : null}
                        </span>
                        {c.email ? (
                          <span className="block text-xs text-muted-foreground">
                            {c.email}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden font-mono text-sm md:table-cell">
                    {c.gstNumber ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {c.state ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {c._count.tickets}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${c.id}`}
                      className="text-muted-foreground transition-colors group-hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
