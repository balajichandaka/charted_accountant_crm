"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleSubtask } from "@/actions/tickets";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SubtaskStatus } from "@/types/domain";

type Subtask = {
  id: string;
  title: string;
  status: SubtaskStatus;
  assignee?: { name: string } | null;
};

export function TicketSubtasks({ subtasks }: { subtasks: Subtask[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const done = subtasks.filter((s) => s.status === "DONE").length;

  if (subtasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No sub-tasks on this ticket.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-status-done transition-all"
            style={{ width: `${(done / subtasks.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular">
          {done}/{subtasks.length}
        </span>
      </div>
      <ul className="space-y-1">
        {subtasks.map((s) => {
          const checked = s.status === "DONE";
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <Checkbox
                id={s.id}
                checked={checked}
                disabled={pending}
                onCheckedChange={(v) =>
                  start(async () => {
                    const res = await toggleSubtask(s.id, Boolean(v));
                    if (res.ok) router.refresh();
                    else toast.error(res.error);
                  })
                }
              />
              <label
                htmlFor={s.id}
                className={cn(
                  "flex-1 cursor-pointer text-sm",
                  checked && "text-muted-foreground line-through"
                )}
              >
                {s.title}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
