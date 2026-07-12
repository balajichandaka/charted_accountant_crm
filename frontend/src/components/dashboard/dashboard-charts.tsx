"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { TOOLTIP_STYLE, STATUS_CHART_COLOR } from "@/components/charts/chart-theme";
import { STATUS_LABEL } from "@/lib/labels";
import type { TicketStatus } from "@/types/domain";

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Donut of open work by status, colored with the semantic status tokens. */
export function StatusDonut({ data }: { data: { status: TicketStatus; count: number }[] }) {
  const rows = data
    .filter((d) => d.count > 0)
    .map((d) => ({ ...d, label: STATUS_LABEL[d.status] }));
  if (rows.length === 0) return <Empty>No tickets yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="count"
          nameKey="label"
          innerRadius={52}
          outerRadius={84}
          paddingAngle={2}
          strokeWidth={0}
          isAnimationActive={false}
        >
          {rows.map((r) => (
            <Cell key={r.status} fill={STATUS_CHART_COLOR[r.status] ?? "var(--muted-foreground)"} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
