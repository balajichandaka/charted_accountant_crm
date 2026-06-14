import { format, startOfWeek, endOfWeek } from "date-fns";
import { requireUser, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TimesheetGrid, type TimesheetEntry } from "@/components/timesheet/timesheet-grid";

type TimesheetData = {
  from: string;
  to: string;
  userId: string;
  entries: TimesheetEntry[];
};

type TicketsData = {
  tickets: Array<{ id: string; ticketNumber: number | string; title: string; client: { name: string } | null }>;
};

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const token = await getToken();

  const sp = await searchParams;
  const now = new Date();
  const from = sp.from ?? fmt(startOfWeek(now, { weekStartsOn: 1 }));
  const to = sp.to ?? fmt(endOfWeek(now, { weekStartsOn: 1 }));

  const [data, ticketsData] = await Promise.all([
    apiGet<TimesheetData>(`/api/timesheet?from=${from}&to=${to}`, token),
    apiGet<TicketsData>("/api/tickets", token),
  ]);

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
        description="Your week at a glance — log, edit and review your hours per ticket."
      />
      <Card>
        <CardContent className="pt-6">
          <TimesheetGrid
            entries={data.entries}
            from={data.from}
            to={data.to}
            today={fmt(now)}
            tickets={tickets}
          />
        </CardContent>
      </Card>
    </>
  );
}
