import { format, subDays, startOfDay } from "date-fns";
import { Ticket as TicketIcon, CircleCheckBig, Percent, Clock } from "lucide-react";
import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import {
  EmployeeBarChart,
  ThroughputLineChart,
  CategoryPieChart,
  HoursByEmployeeChart,
  HoursPerDayChart,
} from "@/components/charts/analytics-charts";

type AnalyticsData = {
  total: number;
  open: number;
  done30: number;
  employees: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  byStatus: Record<string, number>;
  solvedByEmployee: Array<{ name: string; count: number }>;
  categoryMix: Array<{ name: string; color: string; count: number }>;
  billableMix: Array<{ billable: string; count: number }>;
  throughput: Array<{ month: string; count: number }>;
  topClients: Array<{ name: string; count: number }>;
  clientHealth: Array<{ id: string; name: string; totalTickets: number }>;
  hoursByEmployee: Array<{ name: string; hours: number }>;
  hoursPerDay: Array<{ day: string; hours: number }>;
};

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireCA();
  const token = await getToken();

  const sp = await searchParams;
  const today = new Date();
  // Default window: last 30 days. URL params override.
  const from = sp.from ?? fmtDate(startOfDay(subDays(today, 30)));
  const to = sp.to ?? fmtDate(today);
  const assigneeId = sp.assigneeId;

  const query = new URLSearchParams({ from, to });
  if (assigneeId) query.set("assigneeId", assigneeId);
  const data = await apiGet<AnalyticsData>(`/api/analytics?${query.toString()}`, token);

  const rangeLabel = `${format(new Date(from), "dd MMM")} – ${format(new Date(to), "dd MMM yyyy")}`;
  const done = data.done30;
  const completionRate = data.total ? Math.round((done / data.total) * 100) : 0;
  const billableCount = data.billableMix.find((b) => b.billable === "BILLABLE")?.count ?? 0;
  const nonBillableCount = data.billableMix.find((b) => b.billable === "NON_BILLABLE")?.count ?? 0;
  const totalHours = data.hoursByEmployee.reduce((s, h) => s + h.hours, 0);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Productivity, time tracking and client health across the practice."
      />

      <AnalyticsFilters
        employees={data.employees}
        from={from}
        to={to}
        today={fmtDate(today)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tickets created" value={data.total} hint={`in ${rangeLabel}`} icon={TicketIcon} />
        <KpiCard label="Open now" value={data.open} hint="current — all dates" icon={Clock} accentClassName="bg-status-in-progress/15 text-status-in-progress" />
        <KpiCard label="Completed" value={done} hint={`in ${rangeLabel}`} icon={CircleCheckBig} accentClassName="bg-status-done/15 text-status-done" />
        <KpiCard label="Completion rate" value={`${completionRate}%`} hint="completed ÷ created in range" icon={Percent} accentClassName="bg-chart-4/15 text-chart-4" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets solved per employee</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeBarChart data={data.solvedByEmployee.map((s) => ({ name: s.name, solved: s.count }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Throughput (completed per month)</CardTitle>
          </CardHeader>
          <CardContent>
            <ThroughputLineChart
              data={data.throughput.map((t) => ({ month: format(new Date(t.month), "MMM yy"), count: t.count }))}
            />
          </CardContent>
        </Card>

        {/* Time & productivity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Hours logged per employee</span>
              <span className="text-sm font-normal text-muted-foreground tabular">{totalHours} h total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HoursByEmployeeChart data={data.hoursByEmployee} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hours per day ({rangeLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <HoursPerDayChart
              data={data.hoursPerDay.map((h) => ({ day: format(new Date(h.day), "dd MMM"), hours: h.hours }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work mix by category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 items-center gap-2">
              <CategoryPieChart data={data.categoryMix.map((c) => ({ name: c.name, value: c.count }))} />
              <ul className="space-y-1.5">
                {data.categoryMix.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular text-muted-foreground">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billable mix & top clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Billable</p>
                <p className="text-2xl font-semibold tabular">{billableCount}</p>
              </div>
              <div className="flex-1 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Non-billable</p>
                <p className="text-2xl font-semibold tabular">{nonBillableCount}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.topClients.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.name}</span>
                  <Badge variant="secondary" className="tabular">{c.count} open</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
