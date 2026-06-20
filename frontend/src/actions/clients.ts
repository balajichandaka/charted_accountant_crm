"use server";

import { revalidatePath } from "next/cache";
import { requireCA, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";

export async function createClient(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate<{ id: string }>("POST", "/api/clients", input, token);
  if (result.ok) {
    revalidatePath("/clients");
    revalidatePath("/tickets/new");
  }
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error };
}

export async function updateClient(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PUT", `/api/clients/${id}`, input, token);
  if (result.ok) {
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function setClientActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/clients/${id}/active`, { isActive }, token);
  if (result.ok) {
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("DELETE", `/api/clients/${id}`, {}, token);
  if (result.ok) revalidatePath("/clients");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}
