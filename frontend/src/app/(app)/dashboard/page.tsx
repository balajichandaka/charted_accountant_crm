import { Clock } from "lucide-react";
import { requireUser, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import {
  DashboardKpis,
  type Bucket,
  type BucketTicket,
} from "@/components/dashboard/dashboard-kpis";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { StatusPriorityMix } from "@/components/dashboard/status-priority-mix";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TeamWorkload } from "@/components/dashboard/team-workload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeadlineItem, ActivityItem, WorkloadRow } from "@/components/dashboard/types";

type DashboardData = {
  openCount: number;
  dueThisWeek: number;
  completed30: number;
  activeClients: number;
  overdueCount: number;
  dueTodayCount: number;
  unassignedCount: number;
  blockedCount: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  openTickets: BucketTicket[];
  dueThisWeekTickets: BucketTicket[];
  completedTickets: BucketTicket[];
  overdueTickets: BucketTicket[];
  dueTodayTickets: BucketTicket[];
  unassignedTickets: BucketTicket[];
  blockedTickets: BucketTicket[];
  deadlines: DeadlineItem[];
  recentActivity: ActivityItem[];
  workloadRows: WorkloadRow[];
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

  const kpis: Bucket[] = [
    {
      key: "open",
      label: "Open tickets",
      value: data.openCount,
      icon: "ticket",
      tickets: data.openTickets,
    },
    {
      key: "week",
      label: "Due this week",
      value: data.dueThisWeek,
      icon: "calendar",
      accent: "bg-status-in-progress/15 text-status-in-progress",
      tickets: data.dueThisWeekTickets,
    },
    {
      key: "overdue",
      label: "Overdue",
      value: data.overdueCount,
      icon: "alert",
      accent: "bg-destructive/12 text-destructive",
      tickets: data.overdueTickets,
    },
    // "Clients" is CA-only: for non-CA the backend reuses this field for a
    // personal completed-count, so the label would be misleading.
    ...(isCA
      ? [
          {
            key: "clients",
            label: "Clients",
            value: data.activeClients,
            icon: "building" as const,
            href: "/clients",
          },
        ]
      : []),
    {
      key: "completed",
      label: "Completed (30d)",
      value: data.completed30,
      icon: "check",
      accent: "bg-status-done/15 text-status-done",
      tickets: data.completedTickets,
    },
  ];

  const myHours = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          My hours
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-8">
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
  );

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name?.split(" ")[0] ?? ""}`}
        description={
          isCA
            ? "Firm-wide overview of deadlines, work and team load."
            : "Your deadlines and assigned work at a glance."
        }
      />

      <DashboardKpis buckets={kpis} />

      {/* Two continuous column-stacks so no widget floats with a gap:
          left = deadlines + work charts, right = the action side-rail. */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Left: main work area */}
        <div className="space-y-6 lg:col-span-2">
          <TodayFocus deadlines={data.deadlines} />
          <div className={`grid items-start gap-6 ${isCA ? "sm:grid-cols-2" : ""}`}>
            <StatusPriorityMix byStatus={data.byStatus} byPriority={data.byPriority} />
            {isCA ? <TeamWorkload data={data.workloadRows} /> : null}
          </div>
        </div>

        {/* Right: action side-rail */}
        <div className="space-y-6">
          <NeedsAttention
            overdue={data.overdueTickets}
            unassigned={data.unassignedTickets}
            blocked={data.blockedTickets}
          />
          {myHours}
          <ActivityFeed items={data.recentActivity} />
        </div>
      </div>
    </>
  );
}
