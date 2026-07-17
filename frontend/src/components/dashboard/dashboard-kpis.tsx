"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ticket as TicketIcon,
  CalendarDays,
  CircleCheckBig,
  Building2,
  TriangleAlert,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { TicketNumberBadge } from "@/components/ticket-number-badge";
import { cn } from "@/lib/utils";
import type { TicketStatus, Priority } from "@/types/domain";

// Icon components can't be passed as props across the server→client boundary,
// so the server sends a key and we resolve the component here.
const ICON_MAP: Record<string, LucideIcon> = {
  ticket: TicketIcon,
  calendar: CalendarDays,
  check: CircleCheckBig,
  building: Building2,
  alert: TriangleAlert,
  clock: CalendarClock,
};
export type IconKey = keyof typeof ICON_MAP;

export type BucketTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: TicketStatus;
  priority: Priority;
  client: { name: string };
};

export type Bucket = {
  key: string;
  label: string;
  value: number;
  icon: IconKey;
  accent?: string;
  tickets?: BucketTicket[];
  href?: string; // if set, the card is a link instead of a sheet
};

function TicketList({ tickets, onNavigate }: { tickets: BucketTicket[]; onNavigate: () => void }) {
  if (tickets.length === 0)
    return <p className="px-1 py-6 text-sm text-muted-foreground">No tickets in this bucket.</p>;
  return (
    <ul className="divide-y">
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            href={`/tickets/${t.id}`}
            onClick={onNavigate}
            className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50"
          >
            <TicketNumberBadge number={t.ticketNumber} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">{t.client.name}</span>
            <PriorityBadge priority={t.priority} />
            <StatusBadge status={t.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DashboardKpis({ buckets }: { buckets: Bucket[] }) {
  const [active, setActive] = useState<Bucket | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {buckets.map((b) => {
          const Icon = ICON_MAP[b.icon];
          const inner = (
            <Card className={cn("transition-colors", "hover:border-primary/40 hover:bg-muted/30")}>
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
                    b.accent
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 space-y-0.5 text-left">
                  <p className="truncate text-sm text-muted-foreground">{b.label}</p>
                  <p className="text-2xl font-semibold tabular">{b.value}</p>
                </div>
              </CardContent>
            </Card>
          );
          return b.href ? (
            <Link key={b.key} href={b.href} className="block">
              {inner}
            </Link>
          ) : (
            <button key={b.key} type="button" onClick={() => setActive(b)} className="block w-full">
              {inner}
            </button>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>
              {active?.label} ({active?.tickets?.length ?? 0})
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-1">
            {active?.tickets ? (
              <TicketList tickets={active.tickets} onNavigate={() => setActive(null)} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

