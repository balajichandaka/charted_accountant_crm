"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  subDays,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TeamRow = {
  id: string;
  name: string;
  totalMinutes: number;
  billableMinutes: number;
  perDay: Record<string, number>;
};

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function TeamTimesheet({
  employees,
  from,
  to,
  today,
}: {
  employees: TeamRow[];
  from: string;
  to: string;
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) });

  function goWeek(anchor: Date) {
    const f = startOfWeek(anchor, { weekStartsOn: 1 });
    const t = endOfWeek(anchor, { weekStartsOn: 1 });
    router.push(`${pathname}?from=${dayKey(f)}&to=${dayKey(t)}`);
  }

  const rangeLabel = `${format(new Date(from), "dd MMM")} – ${format(new Date(to), "dd MMM yyyy")}`;
  const isCurrentWeek = from === dayKey(startOfWeek(new Date(today), { weekStartsOn: 1 }));

  const dayTotal = (d: Date) =>
    employees.reduce((s, e) => s + (e.perDay[dayKey(d)] ?? 0), 0);
  const grandTotal = employees.reduce((s, e) => s + e.totalMinutes, 0);
  const billableTotal = employees.reduce((s, e) => s + e.billableMinutes, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => goWeek(subDays(new Date(from), 7))} title="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => goWeek(new Date())} disabled={isCurrentWeek}>
            This week
          </Button>
          <Button variant="outline" size="icon" onClick={() => goWeek(addDays(new Date(from), 7))} title="Next week">
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-sm font-medium">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Team total </span>
            <span className="font-semibold tabular">{fmtHours(grandTotal)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Billable </span>
            <span className="font-semibold tabular">{fmtHours(billableTotal)}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-primary/10">
              <th className="sticky left-0 z-10 bg-primary/10 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-primary">
                Employee
              </th>
              {days.map((d) => (
                <th
                  key={dayKey(d)}
                  className={`min-w-16 px-2 py-2 text-center text-xs font-bold uppercase tracking-wide ${
                    dayKey(d) === today ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {format(d, "EEE")}
                  <span className="block text-[11px] font-normal">{format(d, "dd")}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-primary">Total</th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-primary">Billable</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={days.length + 3} className="px-3 py-10 text-center text-muted-foreground">
                  No active employees.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="border-t even:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium even:bg-muted/30">
                    {e.name}
                  </td>
                  {days.map((d) => {
                    const mins = e.perDay[dayKey(d)] ?? 0;
                    return (
                      <td
                        key={dayKey(d)}
                        className={`px-2 py-2 text-center tabular ${mins ? "" : "text-muted-foreground/30"}`}
                      >
                        {mins ? fmtHours(mins) : "—"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular">
                    {e.totalMinutes ? fmtHours(e.totalMinutes) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular text-muted-foreground">
                    {e.billableMinutes ? fmtHours(e.billableMinutes) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {employees.length > 0 ? (
            <tfoot>
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Daily total
                </td>
                {days.map((d) => (
                  <td key={dayKey(d)} className="px-2 py-2 text-center tabular">
                    {dayTotal(d) ? fmtHours(dayTotal(d)) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular">{fmtHours(grandTotal)}</td>
                <td className="px-3 py-2 text-right tabular">{fmtHours(billableTotal)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
