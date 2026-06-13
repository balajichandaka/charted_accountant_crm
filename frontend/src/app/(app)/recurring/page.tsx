import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RecurringManager } from "@/components/recurring/recurring-manager";
import type { Frequency, ScheduleRow } from "@/components/recurring/types";

// Raw schedule shape as returned by the backend (nested relations).
type RawSchedule = {
  id: string;
  frequency: Frequency;
  dayOfMonth: number | null;
  dueOffsetDays: number;
  isActive: boolean;
  nextRunAt: string | null;
  lastGeneratedFor: string | null;
  client: { id: string; name: string } | null;
  template: { id: string; name: string; category: { name: string } | null } | null;
  assignee: { id: string; name: string } | null;
};

type RecurringData = {
  schedules: RawSchedule[];
  clients: Array<{ id: string; name: string }>;
  templates: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string }>;
};

export default async function RecurringPage() {
  await requireCA();
  const token = await getToken();

  const { schedules, clients, templates, employees } =
    await apiGet<RecurringData>("/api/recurring", token);

  // Flatten the nested relations into the row shape the manager renders.
  const rows: ScheduleRow[] = schedules.map((s) => ({
    id: s.id,
    clientName: s.client?.name ?? "Unknown client",
    templateName: s.template?.name ?? "Unknown template",
    categoryName: s.template?.category?.name ?? null,
    assigneeId: s.assignee?.id ?? null,
    assigneeName: s.assignee?.name ?? null,
    frequency: s.frequency,
    dayOfMonth: s.dayOfMonth,
    dueOffsetDays: s.dueOffsetDays,
    nextRunAt: s.nextRunAt,
    lastGeneratedFor: s.lastGeneratedFor,
    isActive: s.isActive,
  }));

  return (
    <>
      <PageHeader
        title="Recurring schedules"
        description="Auto-generate periodic work (e.g. monthly GST filing) per client."
      />
      <Card>
        <CardContent className="pt-6">
          <RecurringManager
            schedules={rows}
            clients={clients}
            templates={templates}
            employees={employees}
          />
        </CardContent>
      </Card>
    </>
  );
}
