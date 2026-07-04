import { format, startOfWeek, endOfWeek } from "date-fns";
import { Suspense } from "react";
import { requireUser, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TimesheetShell } from "@/components/timesheet/timesheet-shell";
import type { TimesheetEntry } from "@/components/timesheet/calendar-utils";
import type { TeamRow } from "@/components/timesheet/team-hours-grid";

type TimesheetData = {
  from: string;
  to: string;
  userId: string;
  entries: TimesheetEntry[];
};

type TeamData = {
  from: string;
  to: string;
  employees: TeamRow[];
};

type TicketsData = {
  tickets: Array<{
    id: string;
    ticketNumber: number | string;
    title: string;
    client: { name: string } | null;
  }>;
};

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const token = await getToken();

  const sp = await searchParams;
  const now = new Date();
  const from = sp.from ?? fmt(startOfWeek(now, { weekStartsOn: 1 }));
  const to = sp.to ?? fmt(endOfWeek(now, { weekStartsOn: 1 }));
  const view = sp.view === "day" ? "day" : "week";
  const dayDate = sp.date ?? fmt(now);
  const initialTab = sp.tab === "team" ? "team" : "mine";
  const isLeadership = user.role === "CA" || user.role === "MANAGER";

  const fetches: [
    Promise<TimesheetData>,
    Promise<TicketsData>,
    Promise<TeamData | null>,
  ] = [
    apiGet<TimesheetData>(`/api/timesheet?from=${from}&to=${to}`, token),
    apiGet<TicketsData>("/api/tickets", token),
    isLeadership
      ? apiGet<TeamData>(`/api/timesheet/team?from=${from}&to=${to}`, token)
      : Promise.resolve(null),
  ];

  const [data, ticketsData, teamData] = await Promise.all(fetches);

  const tickets = ticketsData.tickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    title: t.title,
    clientName: t.client?.name ?? "—",
  }));

  return (
    <>
      <PageHeader
        title="Timesheet"
        description="Log and review your hours in a calendar view. Leadership can review team totals in the Team tab."
      />
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-6">
          <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}>
            <TimesheetShell
              entries={data.entries}
              from={data.from}
              to={data.to}
              today={fmt(now)}
              tickets={tickets}
              userId={user.id}
              role={user.role}
              teamEmployees={teamData?.employees ?? []}
              initialTab={initialTab}
              view={view}
              dayDate={dayDate}
            />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}
