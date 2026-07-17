import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { TemplateForm } from "@/components/templates/template-form";

type FormData = {
  categories: Array<{ id: string; name: string }>;
};

export default async function NewTemplatePage() {
  await requireUser();
  const token = await getToken();

  const { categories } = await apiGet<FormData>("/api/templates/form-data", token);

  return (
    <>
      <Link
        href="/templates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Templates
      </Link>
      <PageHeader
        title="New work template"
        description="Define a task and its sub-task checklist."
      />
      <TemplateForm categories={categories} />
    </>
  );
}
