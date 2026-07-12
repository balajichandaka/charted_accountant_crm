import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDonut } from "@/components/dashboard/dashboard-charts";
import { PRIORITY_ORDER, PRIORITY_LABEL, PRIORITY_BADGE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/types/domain";

const DONUT_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED"];

export function StatusPriorityMix({
  byStatus,
  byPriority,
}: {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}) {
  const donutData = DONUT_STATUSES.map((status) => ({ status, count: byStatus[status] ?? 0 }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open work mix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusDonut data={donutData} />
        <div className="grid grid-cols-2 gap-2">
          {PRIORITY_ORDER.map((p) => (
            <div
              key={p}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5",
                PRIORITY_BADGE[p]
              )}
            >
              <span className="text-xs font-medium">{PRIORITY_LABEL[p]}</span>
              <span className="text-sm font-semibold tabular">{byPriority[p] ?? 0}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
