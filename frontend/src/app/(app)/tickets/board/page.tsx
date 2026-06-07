import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TicketBoard } from "@/components/tickets/ticket-board";

type BoardTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string;
  clientName: string;
  assigneeName: string | null;
};

export default async function BoardPage() {
  await requireUser();
  const token = await getToken();

  const tickets = await apiGet<BoardTicket[]>("/api/tickets/board", token);

  return (
    <>
      <PageHeader
        title="Board"
        description="Drag tickets across columns to update their status."
      >
        <Button asChild>
          <Link href="/tickets/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </PageHeader>

      <TicketBoard tickets={tickets as unknown as import("@/components/tickets/ticket-board").BoardTicket[]} />
    </>
  );
}
