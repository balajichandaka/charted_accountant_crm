import { requireCA } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { CategoryManager } from "@/components/settings/category-manager";
import { FirmBranding, type FirmProfile } from "@/components/settings/firm-branding";
import { EmailSettings, type FirmEmailSettings } from "@/components/settings/email-settings";
import { CollapsibleCard } from "@/components/settings/collapsible-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Category = {
  id: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  isActive: boolean;
  _count: { tickets: number };
};

export default async function SettingsPage() {
  const user = await requireCA();
  const token = await getToken();

  const categories = await apiGet<Category[]>("/api/categories", token);
  const firm = await apiGet<FirmProfile & FirmEmailSettings>("/api/firm", token);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your firm's branding, categories of work, and account."
      />

      <CollapsibleCard title="Firm profile & branding">
        <FirmBranding firm={firm} />
      </CollapsibleCard>

      <CollapsibleCard title="Email sending (SMTP)">
        <EmailSettings firm={firm} />
      </CollapsibleCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Categories of work</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryManager
              categories={categories.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                colorHex: c.colorHex,
                isActive: c.isActive,
                count: c._count.tickets,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p>{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p>{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p>Administrator (CA)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
