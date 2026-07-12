import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  ArrowRightLeft,
  UserPlus,
  MessageSquare,
  CheckSquare,
  Clock,
  Paperclip,
  Pencil,
  Repeat,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityItem } from "@/components/dashboard/types";

const ICON: Record<string, LucideIcon> = {
  CREATED: Plus,
  STATUS_CHANGED: ArrowRightLeft,
  ASSIGNED: UserPlus,
  COMMENTED: MessageSquare,
  SUBTASK_TOGGLED: CheckSquare,
  TIME_LOGGED: Clock,
  ATTACHMENT_ADDED: Paperclip,
  UPDATED: Pencil,
  RECURRING_GENERATED: Repeat,
};
const VERB: Record<string, string> = {
  CREATED: "created",
  STATUS_CHANGED: "updated status of",
  ASSIGNED: "assigned",
  COMMENTED: "commented on",
  SUBTASK_TOGGLED: "updated a subtask on",
  TIME_LOGGED: "logged time on",
  ATTACHMENT_ADDED: "added a file to",
  UPDATED: "updated",
  RECURRING_GENERATED: "generated",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="size-4 text-muted-foreground" />
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {items.map((a) => {
              const Icon = ICON[a.type] ?? ActivityIcon;
              const verb = VERB[a.type] ?? "updated";
              return (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{a.actorName}</span>{" "}
                      <span className="text-muted-foreground">{verb}</span>{" "}
                      {a.ticketId ? (
                        <Link href={`/tickets/${a.ticketId}`} className="font-medium text-primary hover:underline">
                          #{a.ticketNumber} {a.ticketTitle}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">a ticket</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
