import { Ticket as TicketIcon, CircleCheckBig, Percent, Clock } from "lucide-react";
import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EmployeeBarChart,
  ThroughputLineChart,
  CategoryPieChart,
} from "@/components/charts/analytics-charts";

const CHART_HEX = ["#2563eb", "#0d9488", "#d97706", "#9333ea", "#e11d48"];

type AnalyticsData = {
  total: number;
  open: number;
  done30: number;
  byStatus: Array<{ status: string; count: number }>;
  solvedByEmployee: Array<{ name: string; solved: number }>;
  categoryMix: Array<{ name: string; value: number }>;
  billableMix: { billable: number; nonBillable: number };
  throughput: Array<{ month: string; count: number }>;
  topClients: Array<{ id: string; name: string; total: number; done: number }>;
  clientHealth: Array<{ id: string; name: string; total: number; done: number }>;
};

export default async function AnalyticsPage() {
  await requireCA();
  const token = await getToken();

  const data = await apiGet<AnalyticsData>("/api/analytics", token);

  const {
    total,
    open,
    solvedByEmployee,
    categoryMix,
    billableMix,
    throughput,
    topClients,
  } = data;

  // Use done30 as the "completed" KPI (done in last 30 days), or fall back to total done
  const done = data.done30;
  const completionRate = total ? Math.round((done / total) * 100) : 0;

  const billableCount = billableMix.billable;
  const nonBillableCount = billableMix.nonBillable;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Productivity, throughput and client health across the practice."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total tickets" value={total} icon={TicketIcon} />
        <KpiCard
          label="Open"
          value={open}
          icon={Clock}
          accentClassName="bg-status-in-progress/15 text-status-in-progress"
        />
        <KpiCard
          label="Completed"
          value={done}
          icon={CircleCheckBig}
          accentClassName="bg-status-done/15 text-status-done"
        />
        <KpiCard
          label="Completion rate"
          value={`${completionRate}%`}
          icon={Percent}
          accentClassName="bg-chart-4/15 text-chart-4"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets solved per employee</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeBarChart data={solvedByEmployee} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Throughput (completed per month)</CardTitle>
          </CardHeader>
          <CardContent>
            <ThroughputLineChart data={throughput} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work mix by category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 items-center gap-2">
              <CategoryPieChart data={categoryMix} />
              <ul className="space-y-1.5">
                {categoryMix.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: CHART_HEX[i % CHART_HEX.length] }}
                    />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular text-muted-foreground">{c.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billable mix & client health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Billable</p>
                <p className="text-2xl font-semibold tabular">{billableCount}</p>
              </div>
              <div className="flex-1 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Non-billable</p>
                <p className="text-2xl font-semibold tabular">
                  {nonBillableCount}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {topClients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular">
                      {c.total} total
                    </Badge>
                    <Badge variant="outline" className="tabular">
                      {c.done} done
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
