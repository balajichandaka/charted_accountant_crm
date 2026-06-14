"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";

export async function updateTimeEntry(
  id: string,
  input: { minutes?: number; workDate?: string; description?: string; billable?: boolean }
): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate("PATCH", `/api/timesheet/entries/${id}`, input, token);
  if (result.ok) revalidatePath("/timesheet");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

export async function deleteTimeEntry(id: string): Promise<ActionResult> {
  await requireUser();
  const token = await getToken();
  const result = await apiMutate("DELETE", `/api/timesheet/entries/${id}`, {}, token);
  if (result.ok) revalidatePath("/timesheet");
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}
