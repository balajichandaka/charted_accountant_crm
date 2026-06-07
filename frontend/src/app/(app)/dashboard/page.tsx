import Link from "next/link";
import { Ticket as TicketIcon, CalendarDays, CircleCheckBig, Building2 } from "lucide-react";
import { requireUser, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import type { TicketStatus } from "@/types/domain";

type DashboardData = {
  openCount: number; dueThisWeek: number; completed30: number; activeClients: number;
  byStatus: Record<string, number>;
  dueSoon: Array<{ id: string; ticketNumber: number; title: string; priority: string; status: string; client: { name: string }; dueDate: string | null }>;
  workloadRows: Array<{ name: string; count: number }>;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const token = await getToken();
  const data = await apiGet<DashboardData>("/api/analytics/dashboard", token);
  const isCA = user.role === "CA";

  return (
    <>
      <PageHeader title={`Welcome, ${user.name?.split(" ")[0] ?? ""}`} description={isCA ? "Firm-wide overview of work, clients and team load." : "Your assigned work at a glance."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open tickets" value={data.openCount} icon={TicketIcon} />
        <KpiCard label="Due this week" value={data.dueThisWeek} icon={CalendarDays} accentClassName="bg-status-review/15 text-status-review" />
        <KpiCard label="Completed (30 days)" value={data.completed30} icon={CircleCheckBig} accentClassName="bg-status-done/15 text-status-done" />
        <KpiCard label={isCA ? "Active clients" : "Total completed"} value={data.activeClients} icon={Building2} accentClassName="bg-chart-4/15 text-chart-4" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{isCA ? "Due soon" : "My open tickets"}</CardTitle>
            <Link href="/tickets" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {data.dueSoon.length === 0 ? (
              <EmptyState icon={TicketIcon} title="Nothing pending" description="No open tickets right now." />
            ) : (
              <ul className="divide-y">
                {data.dueSoon.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40">
                      <span className="text-xs text-muted-foreground tabular">#{t.ticketNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                      <PriorityBadge priority={t.priority as never} />
                      <StatusBadge status={t.status as TicketStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>By status</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(["OPEN","IN_PROGRESS","REVIEW","BLOCKED","DONE"] as TicketStatus[]).map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-sm font-medium tabular">{data.byStatus[s] ?? 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          {isCA && data.workloadRows.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Team workload</CardTitle></CardHeader>
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
