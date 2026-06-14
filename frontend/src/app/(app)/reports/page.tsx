import { format, subDays, startOfDay } from "date-fns";
import { requireCA, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportTable } from "@/components/reports/report-table";
import type { ReportRow } from "@/components/reports/columns";

type IdName = { id: string; name: string };
type ReportData = {
  tickets: ReportRow[];
  clients: IdName[];
  categories: IdName[];
  employees: IdName[];
};

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireCA();
  const token = await getToken();

  const sp = await searchParams;
  const today = new Date();
  const from = sp.from ?? fmtDate(startOfDay(subDays(today, 30)));
  const to = sp.to ?? fmtDate(today);

  const query = new URLSearchParams({ from, to });
  for (const key of ["assigneeId", "status", "clientId", "categoryId"] as const) {
    if (sp[key]) query.set(key, sp[key]!);
  }

  const data = await apiGet<ReportData>(`/api/analytics/report?${query.toString()}`, token);

  return (
    <>
      <PageHeader
        title="Reporting"
        description="Filter tickets, preview the report, then download it as Excel."
      />

      <Card>
        <CardContent className="space-y-5 pt-6">
          <ReportFilters
            from={from}
            to={to}
            today={fmtDate(today)}
            employees={data.employees}
            clients={data.clients}
            categories={data.categories}
          />
          <ReportTable rows={data.tickets} fileDate={to} />
        </CardContent>
      </Card>
    </>
  );
}
