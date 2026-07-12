import { Users } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkloadRow } from "@/components/dashboard/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Open tickets per assignee, drawn as a proportional bar list (denser and
 * calmer than a chart when the team is small). Unassigned work is called out
 * in amber to match the "needs attention" cue used elsewhere on the dashboard.
 */
export function TeamWorkload({ data }: { data: WorkloadRow[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          Team workload
        </CardTitle>
        {total > 0 ? (
          <CardAction>
            <span className="text-xs text-muted-foreground">
              {total} open{" "}
              {total === 1 ? "ticket" : "tickets"}
            </span>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No open work assigned.</p>
        ) : (
          <ul className="max-h-[280px] space-y-3.5 overflow-y-auto pr-1">
            {rows.map((row) => {
              const pct = Math.round((row.count / max) * 100);
              return (
                <li key={row.name} className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                        row.unassigned
                          ? "bg-status-review/15 text-status-review"
                          : "bg-primary/10 text-primary"
                      )}
                      aria-hidden
                    >
                      {row.unassigned ? "–" : initials(row.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular">{row.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        row.unassigned ? "bg-status-review" : "bg-primary"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
