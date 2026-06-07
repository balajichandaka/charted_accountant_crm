"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const AXIS = "var(--muted-foreground)";
const GRID = "var(--border)";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function EmployeeBarChart({
  data,
}: {
  data: { name: string; solved: number }[];
}) {
  if (data.length === 0)
    return <Empty>No completed tickets yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="solved" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ThroughputLineChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  if (data.length === 0) return <Empty>No completed tickets yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--chart-1)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0) return <Empty>No tickets yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
