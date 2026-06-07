import Link from "next/link";
import { format } from "date-fns";
import type { Ticket, Client, User } from "@/types/domain";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type TicketRow = Ticket & {
  client?: Pick<Client, "id" | "name"> | null;
  assignee?: Pick<User, "id" | "name"> | null;
};

export function TicketTable({
  tickets,
  hideClient = false,
}: {
  tickets: TicketRow[];
  hideClient?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">#</TableHead>
          <TableHead>Title</TableHead>
          {!hideClient ? (
            <TableHead className="hidden md:table-cell">Client</TableHead>
          ) : null}
          <TableHead className="hidden lg:table-cell">Assignee</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((t) => {
          const overdue =
            t.dueDate &&
            t.status !== "DONE" &&
            t.status !== "CANCELLED" &&
            new Date(t.dueDate) < new Date();
          return (
            <TableRow key={t.id} className="cursor-pointer">
              <TableCell className="text-xs text-muted-foreground tabular">
                <Link href={`/tickets/${t.id}`}>#{t.ticketNumber}</Link>
              </TableCell>
              <TableCell>
                <Link href={`/tickets/${t.id}`} className="font-medium">
                  {t.title}
                </Link>
              </TableCell>
              {!hideClient ? (
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  <Link href={`/tickets/${t.id}`}>{t.client?.name ?? "—"}</Link>
                </TableCell>
              ) : null}
              <TableCell className="hidden text-sm lg:table-cell">
                <Link href={`/tickets/${t.id}`}>
                  {t.assignee?.name ?? (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/tickets/${t.id}`}>
                  <PriorityBadge priority={t.priority} />
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/tickets/${t.id}`}>
                  <StatusBadge status={t.status} />
                </Link>
              </TableCell>
              <TableCell
                className={cn(
                  "hidden text-sm sm:table-cell tabular",
                  overdue ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <Link href={`/tickets/${t.id}`}>
                  {t.dueDate ? format(new Date(t.dueDate), "dd MMM yyyy") : "—"}
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
