"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeTicketStatus, assignTicket } from "@/actions/tickets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import type { TicketStatus } from "@/types/domain";

const UNASSIGNED = "__unassigned__";

export function StatusSelect({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          const res = await changeTicketStatus(ticketId, v as TicketStatus);
          if (res.ok) {
            toast.success("Status updated");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AssigneeSelect({
  ticketId,
  assigneeId,
  employees,
}: {
  ticketId: string;
  assigneeId: string | null;
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      value={assigneeId ?? UNASSIGNED}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          const res = await assignTicket(ticketId, v === UNASSIGNED ? null : v);
          if (res.ok) {
            toast.success("Assignee updated");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {employees.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
