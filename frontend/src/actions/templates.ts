"use server";

import { revalidatePath } from "next/cache";
import { requireCA, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";

export async function createWorkTemplate(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate<{ id: string }>("POST", "/api/templates", input, token);
  if (result.ok) revalidatePath("/templates");
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error };
}

export async function updateWorkTemplate(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PUT", `/api/templates/${id}`, input, token);
  if (result.ok) {
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function setTemplateActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/templates/${id}/active`, { isActive }, token);
  if (result.ok) {
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
  }
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function deleteWorkTemplate(id: string): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("DELETE", `/api/templates/${id}`, {}, token);
  if (result.ok) revalidatePath("/templates");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}
