import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RecurringManager } from "@/components/recurring/recurring-manager";

type Schedule = {
  id: string;
  clientName: string;
  templateName: string;
  assigneeName: string | null;
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
  nextRunAt: string | null;
  isActive: boolean;
};

type RecurringData = {
  schedules: Schedule[];
  clients: Array<{ id: string; name: string }>;
  templates: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string }>;
};

export default async function RecurringPage() {
  await requireCA();
  const token = await getToken();

  const { schedules, clients, templates, employees } =
    await apiGet<RecurringData>("/api/recurring", token);

  return (
    <>
      <PageHeader
        title="Recurring schedules"
        description="Auto-generate periodic work (e.g. monthly GST filing) per client."
      />
      <Card>
        <CardContent className="pt-6">
          <RecurringManager
            schedules={schedules}
            clients={clients}
            templates={templates}
            employees={employees}
          />
        </CardContent>
      </Card>
    </>
  );
}
