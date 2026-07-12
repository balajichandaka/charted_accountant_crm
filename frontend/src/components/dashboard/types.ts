import type { TicketStatus, Priority, Frequency } from "@/types/domain";
import type { BucketTicket } from "@/components/dashboard/dashboard-kpis";

export type { BucketTicket };

export type DeadlineItem =
  | {
      kind: "ticket";
      id: string;
      ticketNumber: number;
      title: string;
      clientName: string;
      date: string;
      status: TicketStatus;
      priority: Priority;
    }
  | {
      kind: "recurring";
      id: string;
      title: string;
      clientName: string;
      date: string;
      frequency: Frequency;
    };

export type ActivityItem = {
  id: string;
  type: string;
  actorName: string;
  ticketId: string | null;
  ticketNumber: number | null;
  ticketTitle: string | null;
  createdAt: string;
};

export type WorkloadRow = { name: string; count: number; unassigned?: boolean };
