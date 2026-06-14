import { format, startOfWeek, endOfWeek } from "date-fns";
import { requireCA, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TeamTimesheet, type TeamRow } from "@/components/timesheet/team-timesheet";

type TeamData = {
  from: string;
  to: string;
  employees: TeamRow[];
};

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export default async function TeamTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireCA();
  const token = await getToken();

  const sp = await searchParams;
  const now = new Date();
  const from = sp.from ?? fmt(startOfWeek(now, { weekStartsOn: 1 }));
  const to = sp.to ?? fmt(endOfWeek(now, { weekStartsOn: 1 }));

  const data = await apiGet<TeamData>(`/api/timesheet/team?from=${from}&to=${to}`, token);

  return (
    <>
      <PageHeader
        title="Team Hours"
        description="Everyone's logged hours for the week — totals, billable split and daily gaps."
      />
      <Card>
        <CardContent className="pt-6">
          <TeamTimesheet employees={data.employees} from={data.from} to={data.to} today={fmt(now)} />
        </CardContent>
      </Card>
    </>
  );
}
