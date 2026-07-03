"use server";

import { revalidatePath } from "next/cache";
import { requireCA, getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";

export async function updateFirm(input: unknown): Promise<ActionResult> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate("PATCH", "/api/firm", input, token);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/", "layout");
  }
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/** Send a test email using the firm's saved SMTP config to the current CA. */
export async function sendTestEmail(): Promise<ActionResult<{ to: string }>> {
  await requireCA();
  const token = await getToken();
  const result = await apiMutate<{ to: string }>("POST", "/api/firm/test-email", {}, token);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error };
}
