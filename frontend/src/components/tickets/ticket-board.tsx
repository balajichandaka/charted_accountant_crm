"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoneConfirmDialog } from "@/components/tickets/done-confirm-dialog";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { changeTicketStatus } from "@/actions/tickets";
import { PriorityBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { STATUS_LABEL, STATUS_DOT, BOARD_COLUMNS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/types/domain";

export type BoardTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: TicketStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  clientName: string;
  assigneeName: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Card({ t, dragging }: { t: BoardTicket; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm",
        dragging && "rotate-2 shadow-lg"
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular">
          #{t.ticketNumber}
        </span>
        <PriorityBadge priority={t.priority} />
      </div>
      <p className="text-sm font-medium leading-snug">{t.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="truncate text-xs text-muted-foreground">
          {t.clientName}
        </span>
        {t.assigneeName ? (
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {initials(t.assigneeName)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </div>
  );
}

function DraggableCard({ t }: { t: BoardTicket }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: t.id });
  return (
    <Link
      href={`/tickets/${t.id}`}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={cn("block touch-none", isDragging && "opacity-40")}
    >
      <Card t={t} />
    </Link>
  );
}

function Column({
  status,
  tickets,
}: {
  status: TicketStatus;
  tickets: BoardTicket[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
        <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
        <span className="text-xs text-muted-foreground tabular">
          {tickets.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver ? "border-primary/50 bg-primary/5" : "bg-muted/30"
        )}
      >
        {tickets.map((t) => (
          <DraggableCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

export function TicketBoard({ tickets }: { tickets: BoardTicket[] }) {
  const router = useRouter();
  const [items, setItems] = useState(tickets);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ ticketId: string; status: TicketStatus } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const grouped = useMemo(() => {
    const g: Record<string, BoardTicket[]> = {};
    for (const s of BOARD_COLUMNS) g[s] = [];
    for (const t of items) (g[t.status] ??= []).push(t);
    return g;
  }, [items]);

  const active = items.find((t) => t.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const ticketId = e.active.id as string;
    const overId = e.over?.id as TicketStatus | undefined;
    if (!overId) return;
    const ticket = items.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === overId) return;

    if (overId === "DONE") {
      setPendingMove({ ticketId, status: "DONE" });
      setDialogOpen(true);
      return;
    }

    const prev = items;
    setItems((cur) =>
      cur.map((t) => (t.id === ticketId ? { ...t, status: overId } : t))
    );
    changeTicketStatus(ticketId, overId).then((res) => {
      if (res.ok) {
        toast.success(`Moved to ${STATUS_LABEL[overId]}`);
        router.refresh();
      } else {
        toast.error(res.error);
        setItems(prev); // rollback
      }
    });
  }

  function onConfirmDone() {
    const move = pendingMove;
    setPendingMove(null);
    setDialogOpen(false);
    if (!move) return;
    const { ticketId, status } = move;
    const prev = items;
    setItems((cur) =>
      cur.map((t) => (t.id === ticketId ? { ...t, status } : t))
    );
    changeTicketStatus(ticketId, status).then((res) => {
      if (res.ok) {
        toast.success(`Moved to ${STATUS_LABEL[status]}`);
        router.refresh();
      } else {
        toast.error(res.error);
        setItems(prev); // rollback
      }
    });
  }

  function onCancelDone() {
    setPendingMove(null);
    setDialogOpen(false);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((status) => (
            <Column key={status} status={status} tickets={grouped[status] ?? []} />
          ))}
        </div>
        <DragOverlay>{active ? <Card t={active} dragging /> : null}</DragOverlay>
      </DndContext>
      <DoneConfirmDialog
        open={dialogOpen}
        onConfirm={onConfirmDone}
        onCancel={onCancelDone}
      />
    </>
  );
}
