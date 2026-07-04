import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TicketBoard } from "@/components/tickets/ticket-board";
import { BoardDoneToggle } from "@/components/tickets/board-sprint-filter";

type BoardTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string;
  clientName: string;
  assigneeName: string | null;
};

type BoardData = {
  tickets: BoardTicket[];
  showDone: boolean;
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const token = await getToken();
  const sp = await searchParams;
  const showDone = sp.showDone === "true";

  const path = showDone ? "/api/tickets/board?showDone=true" : "/api/tickets/board";
  const data = await apiGet<BoardData>(path, token);
  const tickets = data.tickets ?? (data as unknown as BoardTicket[]);

  return (
    <>
      <PageHeader
        title="Board"
        description="Drag tickets across columns to update their status. Click “Show Done” to see the last 7 days of completed work."
      >
        <BoardDoneToggle showDone={showDone} />
        <Button asChild>
          <Link href="/tickets/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </PageHeader>

      <TicketBoard
        tickets={tickets as unknown as import("@/components/tickets/ticket-board").BoardTicket[]}
        showDone={showDone}
      />
    </>
  );
}
