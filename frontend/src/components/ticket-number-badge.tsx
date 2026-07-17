import { cn } from "@/lib/utils";

export function TicketNumberBadge({
  number,
  className,
}: {
  number: number | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground",
        className
      )}
    >
      {number}
    </span>
  );
}
