import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Admin — CA Firm Ops",
};

// Standalone chrome for the super-admin console — deliberately NOT the firm
// AppShell (this surface is not tied to any firm).
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/20">{children}</div>;
}
