import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser, getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { TicketCreateForm } from "@/components/tickets/ticket-create-form";

type Template = {
  id: string;
  name: string;
  categoryId: string;
  documentsRequired: string | null;
  defaultFrequency: string;
  defaultBillable: string;
  defaultPriority: string;
  subtasks: Array<{ title: string }>;
};

type NewTicketFormData = {
  categories: Array<{ id: string; name: string }>;
  templates: Template[];
  clients: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; name: string }>;
};

export default async function NewTicketPage() {
  const user = await requireUser();
  const token = await getToken();

  const { categories, templates, clients, employees, managers } =
    await apiGet<NewTicketFormData>("/api/tickets/new-form", token);

  return (
    <>
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tickets
      </Link>
      <PageHeader
        title="New ticket"
        description="Create work for a client and assign it to your team."
      />
      <TicketCreateForm
        categories={categories}
        templates={(templates as unknown as import("@/components/tickets/ticket-create-form").TemplateOption[]).map((t) => ({
          id: t.id,
          name: t.name,
          categoryId: t.categoryId,
          documentsRequired: t.documentsRequired,
          defaultFrequency: t.defaultFrequency,
          defaultBillable: t.defaultBillable,
          defaultPriority: t.defaultPriority,
          subtasks: t.subtasks,
        }))}
        clients={clients}
        employees={employees}
        managers={managers}
        canCreateClient={user.role === "CA"}
      />
    </>
  );
}
