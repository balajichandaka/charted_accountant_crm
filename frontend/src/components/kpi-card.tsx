import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accentClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accentClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        {Icon ? (
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
              accentClassName
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular">{value}</p>
          {hint ? (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
