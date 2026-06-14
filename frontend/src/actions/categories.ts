"use server";

import { revalidatePath } from "next/cache";
import { requireCA, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";

export async function createCategory(input: unknown): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("POST", "/api/categories", input, token);
  if (result.ok) revalidatePath("/settings");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function updateCategory(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PUT", `/api/categories/${id}`, input, token);
  if (result.ok) revalidatePath("/settings");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function setCategoryActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/categories/${id}/active`, { isActive }, token);
  if (result.ok) revalidatePath("/settings");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("DELETE", `/api/categories/${id}`, {}, token);
  if (result.ok) revalidatePath("/settings");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}
