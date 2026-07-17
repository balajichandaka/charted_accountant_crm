"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { addSubtask, toggleSubtask } from "@/actions/tickets";
import { SubtaskCompleteDialog } from "@/components/tickets/subtask-complete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SubtaskStatus } from "@/types/domain";

type Subtask = {
  id: string;
  title: string;
  status: SubtaskStatus;
  assignee?: { name: string } | null;
};

export function TicketSubtasks({
  ticketId,
  subtasks,
}: {
  ticketId: string;
  subtasks: Subtask[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pendingComplete, setPendingComplete] = useState<Subtask | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addPending, startAdd] = useTransition();

  const done = subtasks.filter((s) => s.status === "DONE").length;

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    startAdd(async () => {
      const res = await addSubtask(ticketId, title);
      if (res.ok) {
        setNewTitle("");
        setAdding(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {subtasks.length > 0 ? (
        <>
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
                    onCheckedChange={(v) => {
                      if (v) {
                        setPendingComplete(s);
                        return;
                      }
                      start(async () => {
                        const res = await toggleSubtask(ticketId, s.id, false);
                        if (res.ok) router.refresh();
                        else toast.error(res.error);
                      });
                    }}
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
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No sub-tasks on this ticket.</p>
      )}

      {adding ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            placeholder="Sub-task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            disabled={addPending}
          />
          <Button size="sm" onClick={handleAdd} disabled={addPending}>
            {addPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={addPending}
            onClick={() => {
              setAdding(false);
              setNewTitle("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Add sub-task
        </Button>
      )}

      {pendingComplete ? (
        <SubtaskCompleteDialog
          ticketId={ticketId}
          subtaskId={pendingComplete.id}
          subtaskTitle={pendingComplete.title}
          open
          onCancel={() => setPendingComplete(null)}
          onLogged={() =>
            start(async () => {
              const res = await toggleSubtask(ticketId, pendingComplete.id, true);
              if (!res.ok) toast.error(res.error);
              setPendingComplete(null);
              router.refresh();
            })
          }
        />
      ) : null}
    </div>
  );
}
