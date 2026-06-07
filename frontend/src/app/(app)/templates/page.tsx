import Link from "next/link";
import { FileStack, Plus, ListChecks } from "lucide-react";
import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FREQUENCY_LABEL, BILLABLE_LABEL } from "@/lib/labels";

type Template = {
  id: string;
  name: string;
  isActive: boolean;
  defaultFrequency: string;
  defaultBillable: string;
  category: {
    name: string;
    colorHex: string | null;
  };
  _count: { subtasks: number };
};

export default async function TemplatesPage() {
  await requireCA();
  const token = await getToken();

  const templates = await apiGet<Template[]>("/api/templates", token);

  // Group by category name
  const groups = new Map<string, typeof templates>();
  for (const t of templates) {
    const key = t.category.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  return (
    <>
      <PageHeader
        title="Work Templates"
        description="Reusable task definitions with sub-task checklists. Pick one when creating a ticket."
      >
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="size-4" />
            New template
          </Link>
        </Button>
      </PageHeader>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No templates yet"
          description="Create work templates so your team can spin up consistent tickets in seconds."
        >
          <Button asChild>
            <Link href="/templates/new">
              <Plus className="size-4" />
              New template
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([category, items]) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: items[0].category.colorHex ?? "#64748b",
                  }}
                />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => (
                  <Link key={t.id} href={`/templates/${t.id}`}>
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium">{t.name}</h3>
                          {!t.isActive ? (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline">
                            {FREQUENCY_LABEL[t.defaultFrequency as keyof typeof FREQUENCY_LABEL]}
                          </Badge>
                          <Badge variant="outline">
                            {BILLABLE_LABEL[t.defaultBillable as keyof typeof BILLABLE_LABEL]}
                          </Badge>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ListChecks className="size-3.5" />
                          {t._count.subtasks} sub-tasks
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
