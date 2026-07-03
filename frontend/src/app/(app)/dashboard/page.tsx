import Link from "next/link";
import { Clock } from "lucide-react";
import { requireUser, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  DashboardKpis,
  type Bucket,
  type BucketTicket,
} from "@/components/dashboard/dashboard-kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/types/domain";

type DashboardData = {
  openCount: number;
  dueThisWeek: number;
  completed30: number;
  activeClients: number;
  byStatus: Record<string, number>;
  openTickets: BucketTicket[];
  dueThisWeekTickets: BucketTicket[];
  completedTickets: BucketTicket[];
  workloadRows: Array<{ name: string; count: number }>;
  myHoursToday: number;
  myHoursThisWeek: number;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const token = await getToken();

  let data: DashboardData;
  try {
    data = await apiGet<DashboardData>("/api/analytics/dashboard", token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load dashboard";
    throw new Error(message);
  }

  const isCA = user.role === "CA";

  const buckets: Bucket[] = [
    {
      key: "open",
      label: "Open tickets",
      value: data.openCount,
      icon: "ticket",
      tickets: data.openTickets,
    },
    {
      key: "due",
      label: "Due this week",
      value: data.dueThisWeek,
      icon: "calendar",
      accent: "bg-status-review/15 text-status-review",
      tickets: data.dueThisWeekTickets,
    },
    {
      key: "completed",
      label: "Completed (30 days)",
      value: data.completed30,
      icon: "check",
      accent: "bg-status-done/15 text-status-done",
      tickets: data.completedTickets,
    },
    isCA
      ? {
          key: "clients",
          label: "Active clients",
          value: data.activeClients,
          icon: "building",
          accent: "bg-chart-4/15 text-chart-4",
          href: "/clients",
        }
      : {
          key: "total",
          label: "Total completed",
          value: data.activeClients,
          icon: "building",
          accent: "bg-chart-4/15 text-chart-4",
          tickets: data.completedTickets,
        },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name?.split(" ")[0] ?? ""}`}
        description={
          isCA
            ? "Firm-wide overview of work, clients and team load."
            : "Your assigned work at a glance."
        }
      />

      <DashboardKpis buckets={buckets} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{isCA ? "Due soon" : "My open tickets"}</CardTitle>
            <Link href="/tickets" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.openTickets.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No open tickets right now.</p>
            ) : (
              <ul className="divide-y">
                {data.openTickets.slice(0, 8).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tickets/${t.id}`}
                      className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40"
                    >
                      <span className="text-xs text-muted-foreground tabular">#{t.ticketNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">{t.client.name}</span>
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                My hours
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6">
              <div>
                <p className="text-2xl font-semibold tabular">{data.myHoursToday}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular">{data.myHoursThisWeek}</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"] as TicketStatus[]).map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-sm font-medium tabular">{data.byStatus[s] ?? 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {isCA && data.workloadRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Team workload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.workloadRows.map((w) => (
                  <div key={w.name} className="flex items-center justify-between text-sm">
                    <span className="truncate">{w.name}</span>
                    <Badge variant="secondary" className="tabular">{w.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
