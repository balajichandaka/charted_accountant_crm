import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { TemplateForm } from "@/components/templates/template-form";
import { TemplateActiveToggle } from "@/components/templates/template-active-toggle";

type Template = {
  id: string;
  name: string;
  categoryId: string;
  description: string | null;
  documentsRequired: string | null;
  defaultFrequency: string;
  defaultBillable: string;
  defaultPriority: string;
  isActive: boolean;
  subtasks: Array<{ title: string }>;
};

type FormData = {
  categories: Array<{ id: string; name: string }>;
};

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireCA();
  const token = await getToken();

  let template: Template;
  let formData: FormData;
  try {
    [template, formData] = await Promise.all([
      apiGet<Template>(`/api/templates/${id}`, token),
      apiGet<FormData>("/api/templates/form-data", token),
    ]);
  } catch {
    notFound();
  }

  const { categories } = formData;

  return (
    <>
      <Link
        href="/templates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Templates
      </Link>
      <PageHeader
        title={template.name}
        description="Edit this work template. Existing tickets keep their own copy."
      >
        <TemplateActiveToggle id={template.id} isActive={template.isActive} />
      </PageHeader>
      <TemplateForm
        categories={categories}
        template={{
          id: template.id,
          name: template.name,
          categoryId: template.categoryId,
          description: template.description,
          documentsRequired: template.documentsRequired,
          defaultFrequency: template.defaultFrequency as import("@/schemas/template").TemplateFormValues["defaultFrequency"],
          defaultBillable: template.defaultBillable as "BILLABLE" | "NON_BILLABLE",
          defaultPriority: template.defaultPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
          subtasks: template.subtasks.map((s) => ({ title: s.title })),
        }}
      />
    </>
  );
}
