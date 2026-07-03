"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BACKEND_URL, apiMutate } from "@/lib/api";
import {
  getPlatformToken,
  setPlatformToken,
  clearPlatformToken,
} from "@/lib/platform-session";
import type { ActionResult } from "@/lib/action-result";

export async function platformLogin(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return "Invalid email or password.";
  }

  let token: string | undefined;
  try {
    const res = await fetch(`${BACKEND_URL}/api/platform/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.ok && json.data?.token) token = json.data.token as string;
    else return "Invalid email or password.";
  } catch {
    return "Could not reach the server. Try again.";
  }

  await setPlatformToken(token);
  redirect("/platform");
}

export async function platformLogout(): Promise<void> {
  await clearPlatformToken();
  redirect("/platform/login");
}

export async function createFirm(input: unknown): Promise<ActionResult> {
  const token = await getPlatformToken();
  if (!token) return { ok: false, error: "Not signed in." };
  const result = await apiMutate("POST", "/api/platform/firms", input, token);
  if (result.ok) revalidatePath("/platform");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function setFirmActive(id: string, isActive: boolean): Promise<ActionResult> {
  const token = await getPlatformToken();
  if (!token) return { ok: false, error: "Not signed in." };
  const result = await apiMutate("PATCH", `/api/platform/firms/${id}`, { isActive }, token);
  if (result.ok) revalidatePath("/platform");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/** Apply a new temp password for a firm's CA (the value previewed in the UI). */
export async function resetCaPassword(
  id: string,
  password?: string
): Promise<ActionResult<{ email: string; password: string }>> {
  const token = await getPlatformToken();
  if (!token) return { ok: false, error: "Not signed in." };
  const result = await apiMutate<{ email: string; password: string }>(
    "POST",
    `/api/platform/firms/${id}/reset-ca-password`,
    password ? { password } : {},
    token
  );
  return result.ok && result.data
    ? { ok: true, data: result.data }
    : { ok: false, error: result.ok ? "No data returned." : result.error };
}
