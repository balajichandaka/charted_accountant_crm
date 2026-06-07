"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import type { TicketStatus } from "@/types/domain";

export async function createTicket(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate<{ id: string }>("POST", "/api/tickets", input, token);
  if (result.ok) {
    revalidatePath("/tickets");
    revalidatePath("/tickets/board");
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
  const result = await apiMutate("PUT", `/api/tickets/${id}`, input, token);
  if (result.ok) {
    revalidatePath("/tickets");
    revalidatePath("/tickets/board");
    revalidatePath(`/tickets/${id}`);
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
  subtaskId: string,
  done: boolean
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  // The ticket ID is not available here at the action level; the backend
  // returns it so we can revalidate the correct path.
  const result = await apiMutate<{ ticketId: string }>(
    "PATCH",
    `/api/tickets/subtasks/${subtaskId}`,
    { done },
    token
  );
  if (result.ok && result.data?.ticketId) {
    revalidatePath(`/tickets/${result.data.ticketId}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function addComment(
  ticketId: string,
  body: string,
  parentId?: string
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate(
    "POST",
    `/api/tickets/${ticketId}/comments`,
    { body, parentId: parentId ?? null },
    token
  );
  if (result.ok) revalidatePath(`/tickets/${ticketId}`);
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}
