import type { TicketStatus, Priority } from "@/types/domain";
import { cn } from "@/lib/utils";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
} from "@/lib/labels";

export function StatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_BADGE[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        PRIORITY_BADGE[priority],
        className
      )}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
