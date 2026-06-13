"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Loader2, CalendarClock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { getScheduleDetail } from "@/actions/recurring";
import { FREQUENCY_LABEL } from "@/lib/labels";
import type { ScheduleRow, ScheduleDetailTicket } from "./types";

function fmt(d: string | null, withTime = false) {
  if (!d) return "—";
  return format(new Date(d), withTime ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy");
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

// Rendered fresh per schedule (keyed by id), so initial state resets on each
// open and the effect only sets state asynchronously after the fetch resolves.
function ScheduleDetailBody({ schedule }: { schedule: ScheduleRow }) {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<ScheduleDetailTicket[]>([]);
  const [upcomingRuns, setUpcomingRuns] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getScheduleDetail(schedule.id).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setTickets(res.data.tickets);
        setUpcomingRuns(res.data.upcomingRuns);
      } else if (!res.ok) {
        toast.error(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [schedule.id]);

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
      {/* Schedule details */}
      <div className="rounded-lg border px-4 py-2">
        <DetailRow label="Client" value={schedule.clientName} />
        <DetailRow label="Category" value={schedule.categoryName ?? "—"} />
        <DetailRow label="Assignee" value={schedule.assigneeName ?? "Unassigned"} />
        <DetailRow label="Day of month" value={schedule.dayOfMonth ?? "—"} />
        <DetailRow label="Due offset" value={`${schedule.dueOffsetDays} days`} />
        <DetailRow label="Next run" value={fmt(schedule.nextRunAt, true)} />
        <DetailRow label="Last generated" value={fmt(schedule.lastGeneratedFor, true)} />
      </div>

      {/* Upcoming runs */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <CalendarClock className="size-4 text-muted-foreground" />
          Upcoming runs
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : upcomingRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming runs (schedule may be paused).</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {upcomingRuns.map((d) => (
              <Badge key={d} variant="outline" className="font-normal">
                {fmt(d)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Generated tickets */}
      <div>
        <p className="mb-2 text-sm font-semibold">
          Generated tickets{!loading ? ` (${tickets.length})` : ""}
        </p>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : tickets.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            This schedule hasn&apos;t generated any tickets yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="text-xs text-muted-foreground tabular">#{t.ticketNumber}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                  <Badge
                    variant={t.origin === "AUTO" ? "secondary" : "outline"}
                    className="shrink-0"
                  >
                    {t.origin === "AUTO" ? "Auto" : "Manual"}
                  </Badge>
                  {t.periodLabel ? (
                    <span className="hidden text-xs text-muted-foreground sm:inline">{t.periodLabel}</span>
                  ) : null}
                  <StatusBadge status={t.status} />
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ScheduleDetailDialog({
  schedule,
  open,
  onOpenChange,
}: {
  schedule: ScheduleRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {schedule?.templateName ?? "Schedule"}
            {schedule ? <Badge variant="outline">{FREQUENCY_LABEL[schedule.frequency]}</Badge> : null}
            {schedule ? (
              <Badge variant={schedule.isActive ? "secondary" : "outline"}>
                {schedule.isActive ? "Active" : "Paused"}
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {schedule ? <ScheduleDetailBody key={schedule.id} schedule={schedule} /> : null}
      </DialogContent>
    </Dialog>
  );
}
