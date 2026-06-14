"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getToken } from "@/lib/session";
import { apiMutate, apiUpload } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import type { TicketStatus } from "@/types/domain";

// The forms collect `targetHours`; the API stores `targetMinutes`.
function withTargetMinutes(input: unknown): Record<string, unknown> {
  const obj = { ...(input as Record<string, unknown>) };
  const hours = obj.targetHours;
  if (hours !== undefined && hours !== null && hours !== "") {
    obj.targetMinutes = Math.round(Number(hours) * 60);
  }
  delete obj.targetHours;
  return obj;
}

function toCreateTicketPayload(input: unknown): Record<string, unknown> {
  const obj = withTargetMinutes(input);
  if (Array.isArray(obj.subtasks)) {
    obj.subtasks = obj.subtasks
      .filter(
        (s): s is { title: string } =>
          typeof s === "object" && s !== null && "title" in s
      )
      .map((s, order) => ({ title: String(s.title).trim(), order }));
  }
  return obj;
}

type CreateTicketResult = {
  id: string;
  recurringSchedule: "created" | "existing" | null;
};

export async function createTicket(
  input: unknown
): Promise<ActionResult<CreateTicketResult>> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate<CreateTicketResult>(
    "POST",
    "/api/tickets",
    toCreateTicketPayload(input),
    token
  );
  if (result.ok) {
    revalidatePath("/tickets");
    revalidatePath("/tickets/board");
    revalidatePath("/recurring");
  }
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error };
}

export async function updateTicket(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate("PUT", `/api/tickets/${id}`, withTargetMinutes(input), token);
  if (result.ok) {
    revalidatePath("/tickets");
    revalidatePath("/tickets/board");
    revalidatePath(`/tickets/${id}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function deleteTicket(id: string): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate("DELETE", `/api/tickets/${id}`, {}, token);
  if (result.ok) {
    revalidatePath("/tickets");
    revalidatePath("/tickets/board");
    revalidatePath("/dashboard");
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function changeTicketStatus(
  id: string,
  status: TicketStatus
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/tickets/${id}/status`, { status }, token);
  if (result.ok) {
    revalidatePath("/tickets");
    revalidatePath("/tickets/board");
    revalidatePath(`/tickets/${id}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function assignTicket(
  id: string,
  assigneeId: string | null
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/tickets/${id}/assign`, { assigneeId }, token);
  if (result.ok) {
    revalidatePath("/tickets");
    revalidatePath("/tickets/board");
    revalidatePath(`/tickets/${id}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function toggleSubtask(
  ticketId: string,
  subtaskId: string,
  done: boolean
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate(
    "PATCH",
    `/api/tickets/${ticketId}/subtasks/${subtaskId}`,
    { status: done ? "DONE" : "TODO" },
    token
  );
  if (result.ok) revalidatePath(`/tickets/${ticketId}`);
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function logTime(
  ticketId: string,
  input: { minutes: number; workDate?: string; description?: string; billable?: boolean }
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate("POST", `/api/tickets/${ticketId}/time-entries`, input, token);
  if (result.ok) {
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/timesheet");
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

// Add a comment, optionally with file attachments (multipart).
export async function addComment(
  ticketId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiUpload(
    `/api/tickets/${ticketId}/comments`,
    formData,
    token
  );
  if (result.ok) revalidatePath(`/tickets/${ticketId}`);
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}
