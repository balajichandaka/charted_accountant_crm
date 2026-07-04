import { format, subDays, startOfDay } from "date-fns";
import { requireCA, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { ReportPageClient } from "@/components/reports/report-page-client";
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
  const dateType = sp.dateType ?? "createdAt";

  const query = new URLSearchParams({ from, to, dateType });
  for (const key of ["assigneeId", "status", "clientId", "categoryId", "priority"] as const) {
    if (sp[key]) query.set(key, sp[key]!);
  }

  const data = await apiGet<ReportData>(`/api/analytics/report?${query.toString()}`, token);

  return (
    <ReportPageClient
      rows={data.tickets}
      fileDate={to}
      from={from}
      to={to}
      dateType={dateType}
      today={fmtDate(today)}
      employees={data.employees}
      clients={data.clients}
      categories={data.categories}
    />
  );
}
