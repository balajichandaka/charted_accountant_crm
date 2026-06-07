"use server";

import { revalidatePath } from "next/cache";
import { requireCA, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";

export async function createSchedule(input: unknown): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("POST", "/api/recurring", input, token);
  if (result.ok) revalidatePath("/recurring");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function setScheduleActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/recurring/${id}/active`, { isActive }, token);
  if (result.ok) revalidatePath("/recurring");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("DELETE", `/api/recurring/${id}`, {}, token);
  if (result.ok) revalidatePath("/recurring");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function runRecurringNow(): Promise<
  ActionResult<{ generated: number; skipped: number }>
> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate<{ generated: number; skipped: number }>(
    "POST",
    "/api/recurring/run",
    {},
    token
  );
  if (result.ok) {
    revalidatePath("/recurring");
    revalidatePath("/tickets");
  }
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error };
}
