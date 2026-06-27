import Link from "next/link";
import { Plus, Ticket as TicketIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketTable } from "@/components/tickets/ticket-table";

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

type TicketsData = {
  tickets: Ticket[];
  clients: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const sp = await searchParams;
  const token = await getToken();

  const params: Record<string, string> = {};
  if (sp.status) params.status = sp.status;
  else params.excludeDone = "true";
  if (sp.priority) params.priority = sp.priority;
  if (sp.assigneeId) params.assigneeId = sp.assigneeId;
  if (sp.clientId) params.clientId = sp.clientId;
  if (sp.categoryId) params.categoryId = sp.categoryId;
  if (sp.q) params.search = sp.q;
  if (sp.dateType) params.dateType = sp.dateType;
  if (sp.dateFrom) params.dateFrom = sp.dateFrom;
  if (sp.dateTo) params.dateTo = sp.dateTo;

  const queryString = new URLSearchParams(params).toString();
  const path = queryString ? `/api/tickets?${queryString}` : "/api/tickets";

  const { tickets, clients, employees, categories } =
    await apiGet<TicketsData>(path, token);

  return (
    <>
      <PageHeader
        title="Tickets"
        description="All work across clients. Filter, search and track to completion."
      >
        <Button asChild>
          <Link href="/tickets/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </PageHeader>

      <TicketFilters
        clients={clients}
        employees={employees}
        categories={categories}
      />

      {tickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No tickets found"
          description="Try clearing filters, or create a new ticket."
        >
          <Button asChild>
            <Link href="/tickets/new">
              <Plus className="size-4" />
              New ticket
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden py-0">
          <TicketTable tickets={tickets as unknown as import("@/components/tickets/ticket-table").TicketRow[]} />
        </Card>
      )}
    </>
  );
}
