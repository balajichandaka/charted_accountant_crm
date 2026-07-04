import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { EditClientButton } from "@/components/clients/client-buttons";
import { ClientActiveToggle } from "@/components/clients/client-active-toggle";
import { ClientDeleteButton } from "@/components/clients/client-delete-button";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const OPEN = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED"] as const;

type Ticket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  clientId: string;
  assignee: { id: string; name: string } | null;
  client: { id: string; name: string };
};

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  gstNumber: string | null;
  billTo: string | null;
  shipTo: string | null;
  rcm: boolean;
  creditPeriodDays: number | null;
  state: string | null;
  fullAddress: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  tickets: Ticket[];
};

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const isCA = user.role === "CA";
  const token = await getToken();

  let client: Client;
  try {
    client = await apiGet<Client>(`/api/clients/${id}`, token);
  } catch {
    notFound();
  }

  const openCount = client.tickets.filter((t) =>
    (OPEN as readonly string[]).includes(t.status)
  ).length;
  const doneCount = client.tickets.filter((t) => t.status === "DONE").length;

  return (
    <>
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Clients
      </Link>

      <PageHeader
        title={client.name}
        description={client.companyName ?? undefined}
      >
        {isCA ? (
          <>
            <ClientActiveToggle id={client.id} isActive={client.isActive} />
            <EditClientButton
              client={{
                id: client.id,
                name: client.name,
                companyName: client.companyName ?? "",
                gstNumber: client.gstNumber ?? "",
                billTo: client.billTo ?? "",
                shipTo: client.shipTo ?? "",
                rcm: client.rcm,
                creditPeriodDays: client.creditPeriodDays ?? undefined,
                state: client.state ?? "",
                fullAddress: client.fullAddress ?? "",
                email: client.email ?? "",
                phone: client.phone ?? "",
                notes: client.notes ?? "",
              }}
            />
            <ClientDeleteButton clientId={client.id} clientName={client.name} />
          </>
        ) : null}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              Client details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="GST Number" value={client.gstNumber} />
              <Detail label="State" value={client.state} />
              <Detail label="Email" value={client.email} />
              <Detail label="Phone" value={client.phone} />
              <Detail label="Bill to" value={client.billTo} />
              <Detail label="Ship to" value={client.shipTo} />
              <Detail
                label="Credit period"
                value={
                  client.creditPeriodDays != null
                    ? `${client.creditPeriodDays} days`
                    : null
                }
              />
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground">RCM</dt>
                <dd>
                  <Badge variant={client.rcm ? "default" : "secondary"}>
                    {client.rcm ? "Applicable" : "No"}
                  </Badge>
                </dd>
              </div>
              <div className="col-span-2">
                <Detail label="Full address" value={client.fullAddress} />
              </div>
              {client.notes ? (
                <div className="col-span-2">
                  <Detail label="Notes" value={client.notes} />
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total tickets</p>
                <p className="text-2xl font-semibold tabular">
                  {client.tickets.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-semibold tabular">{openCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-semibold tabular">{doneCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            {client.tickets.length === 0 ? (
              <CardContent className="py-0">
                <EmptyState
                  title="No tickets for this client"
                  description="Create a ticket to start tracking their work."
                  className="border-0"
                />
              </CardContent>
            ) : (
              <TicketTable tickets={client.tickets as unknown as import("@/components/tickets/ticket-table").TicketRow[]} hideClient />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
