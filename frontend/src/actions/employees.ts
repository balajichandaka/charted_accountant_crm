"use server";

import { revalidatePath } from "next/cache";
import { requireCA, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";

export async function createEmployee(input: unknown): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("POST", "/api/employees", input, token);
  if (result.ok) revalidatePath("/employees");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function updateEmployee(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PUT", `/api/employees/${id}`, input, token);
  if (result.ok) revalidatePath("/employees");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function setUserActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/employees/${id}/active`, { isActive }, token);
  if (result.ok) revalidatePath("/employees");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}
