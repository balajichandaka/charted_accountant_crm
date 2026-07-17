import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketNumberBadge } from "@/components/ticket-number-badge";
import { cn } from "@/lib/utils";
import type { BucketTicket } from "@/components/dashboard/types";

type Reason = "overdue" | "unassigned" | "blocked";

const REASON_STYLE: Record<Reason, string> = {
  overdue: "bg-status-blocked/12 text-status-blocked",
  unassigned: "bg-status-review/15 text-status-review",
  blocked: "bg-destructive/12 text-destructive",
};
const REASON_LABEL: Record<Reason, string> = {
  overdue: "Overdue",
  unassigned: "Unassigned",
  blocked: "Blocked",
};

export function NeedsAttention({
  overdue,
  unassigned,
  blocked,
}: {
  overdue: BucketTicket[];
  unassigned: BucketTicket[];
  blocked: BucketTicket[];
}) {
  // Merge by ticket id; a ticket can carry more than one reason.
  const map = new Map<string, { t: BucketTicket; reasons: Reason[] }>();
  const add = (list: BucketTicket[], reason: Reason) => {
    for (const t of list) {
      const e = map.get(t.id) ?? { t, reasons: [] };
      e.reasons.push(reason);
      map.set(t.id, e);
    }
  };
  add(overdue, "overdue");
  add(blocked, "blocked");
  add(unassigned, "unassigned");

  const rows = [...map.values()];
  const total = rows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-status-review" />
          Needs attention
        </CardTitle>
        {total > 0 ? (
          <CardAction>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular text-muted-foreground">
              {total}
            </span>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nothing needs attention. Nice.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-border/60">
            {rows.slice(0, 8).map(({ t, reasons }) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <TicketNumberBadge number={t.ticketNumber} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                  <span className="flex shrink-0 gap-1">
                    {reasons.map((r) => (
                      <span
                        key={r}
                        className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", REASON_STYLE[r])}
                      >
                        {REASON_LABEL[r]}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
