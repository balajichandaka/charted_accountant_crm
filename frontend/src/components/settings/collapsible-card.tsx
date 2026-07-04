"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * A Card whose body collapses behind a clickable header. Used for one-time setup
 * sections (firm branding, SMTP) so they stay tucked away until needed.
 * Closed by default.
 */
export function CollapsibleCard({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 text-left transition-colors hover:text-primary focus-visible:outline-none"
      >
        <span className="font-heading text-base font-medium leading-snug">{title}</span>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}
