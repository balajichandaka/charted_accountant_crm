"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireCA, getToken } from "@/lib/session";
import { apiGet, apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import type { ScheduleDetail } from "@/components/recurring/types";

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

export async function updateSchedule(
  id: string,
  input: unknown
): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/recurring/${id}`, input, token);
  if (result.ok) revalidatePath("/recurring");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function getScheduleDetail(
  id: string
): Promise<ActionResult<ScheduleDetail>> {
  await requireCA();
  const token = await getToken();
  try {
    const data = await apiGet<ScheduleDetail>(`/api/recurring/${id}`, token);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err); // let Next redirects (e.g. 401) propagate
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load schedule" };
  }
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
