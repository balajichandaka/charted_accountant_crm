import Link from "next/link";
import { format, isToday } from "date-fns";
import { Repeat, CalendarCheck, Sparkles, Sparkle, Star, CheckCircle2 } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/status-badge";
import { FREQUENCY_LABEL } from "@/lib/labels";
import type { DeadlineItem } from "@/components/dashboard/types";
import type { Frequency } from "@/types/domain";

function Row({ item }: { item: DeadlineItem }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
      {item.kind === "recurring" ? (
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-chart-4/15 text-chart-4">
          <Repeat className="size-3.5" aria-hidden />
        </span>
      ) : (
        <span className="w-7 shrink-0 text-center text-xs text-muted-foreground tabular">
          #{item.ticketNumber}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
      <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:inline">
        {item.clientName}
      </span>
      {item.kind === "recurring" ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {FREQUENCY_LABEL[item.frequency as Frequency] ?? "Recurring"}
        </span>
      ) : (
        <PriorityBadge priority={item.priority} />
      )}
    </div>
  );

  return item.kind === "ticket" ? (
    <Link href={`/tickets/${item.id}`} className="block">
      {inner}
    </Link>
  ) : (
    <Link href="/recurring" className="block">
      {inner}
    </Link>
  );
}

/**
 * "Today's focus" — a single-day view of everything due today (tickets + recurring
 * runs). Overdue / this-week / next-week are intentionally out of scope: this widget
 * answers only "what do I need to finish today?". Quiet days get a warm empty state.
 */
export function TodayFocus({ deadlines }: { deadlines: DeadlineItem[] }) {
  const now = new Date();
  const items = deadlines.filter((d) => d.date && isToday(new Date(d.date)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="size-4 text-muted-foreground" />
          Today&apos;s focus
        </CardTitle>
        <CardAction>
          <span className="text-xs text-muted-foreground tabular">{format(now, "EEE, d MMM")}</span>
        </CardAction>
      </CardHeader>
      <CardContent className="max-h-[460px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center motion-safe:animate-[tf-rise_0.45s_ease-out]">
            <div className="relative grid place-items-center">
              {/* soft pulsing halo */}
              <span
                className="absolute size-14 rounded-full bg-status-done/25 motion-safe:animate-[tf-halo_2.8s_ease-in-out_infinite]"
                aria-hidden
              />
              {/* floating icon chip */}
              <span className="relative grid size-14 place-items-center rounded-full bg-status-done/12 text-status-done motion-safe:animate-[tf-float_3.6s_ease-in-out_infinite]">
                <Sparkles className="size-6" aria-hidden />
              </span>
              {/* twinkling accents */}
              <Sparkle
                className="absolute -right-1.5 -top-1 size-3.5 text-status-done/80 motion-safe:animate-[tf-twinkle_2.1s_ease-in-out_infinite]"
                aria-hidden
              />
              <Star
                className="absolute -bottom-0.5 -left-2 size-2.5 fill-status-done/60 text-status-done/60 motion-safe:animate-[tf-twinkle_2.6s_ease-in-out_infinite] [animation-delay:0.7s]"
                aria-hidden
              />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-status-done">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                Every deadline&apos;s handled on time — great work keeping the firm on track.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-status-done/12 px-3 py-1 text-xs font-semibold text-status-done">
              <CheckCircle2 className="size-3.5" aria-hidden />
              On schedule
            </span>
          </div>
        ) : (
          <div className="-mx-2">
            {items.map((item) => (
              <Row key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
