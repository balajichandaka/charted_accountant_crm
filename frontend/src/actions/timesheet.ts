"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getToken } from "@/lib/session";
import { apiGet, apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import type { TimesheetEntry } from "@/components/timesheet/calendar-utils";

export type TeamDayDetail = {
  user: { id: string; name: string };
  date: string;
  entries: TimesheetEntry[];
  totalMinutes: number;
};

export async function getTeamDayDetail(
  userId: string,
  date: string
): Promise<{ ok: true; data: TeamDayDetail } | { ok: false; error: string }> {
  await requireUser();
  const token = await getToken();
  try {
    const data = await apiGet<TeamDayDetail>(
      `/api/timesheet/team/detail?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`,
      token
    );
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load entries." };
  }
}

export async function updateTimeEntry(
  id: string,
  input: {
    minutes?: number;
    startMinutes?: number;
    workDate?: string;
    description?: string;
    billable?: boolean;
  }
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
