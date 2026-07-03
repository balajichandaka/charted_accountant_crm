import { requireUser, getToken } from "@/lib/session";
import { BACKEND_URL } from "@/lib/api";
import { AppShell } from "@/components/app-shell";

async function getFirmBrand(token: string | undefined): Promise<{ brandName?: string; logoUrl?: string }> {
  if (!token) return {};
  try {
    const res = await fetch(`${BACKEND_URL}/api/firm`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.ok) {
      return {
        brandName: json.data.brandName ?? json.data.name ?? undefined,
        logoUrl: json.data.logoUrl ?? undefined,
      };
    }
  } catch {
    // Branding is non-critical; fall back to defaults.
  }
  return {};
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const token = await getToken();
  const brand = await getFirmBrand(token);
  return (
    <AppShell user={user} brandName={brand.brandName} logoUrl={brand.logoUrl}>
      {children}
    </AppShell>
  );
}
