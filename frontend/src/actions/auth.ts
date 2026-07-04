"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { loginWithBackend } from "@/lib/backend-auth";
import { firmSlugFromHost } from "@/lib/tenant";
import { getToken } from "@/lib/session";
import { apiMutate } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/lib/action-result";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return "Invalid email or password.";
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Resolve which firm this login is for from the subdomain the user is on.
    const headerList = await headers();
    const host = headerList.get("x-firm-slug") ?? headerList.get("host");
    const firmSlug = firmSlugFromHost(host);
    if (!firmSlug) {
      return "This sign-in page is not associated with a firm. Use your firm's address (e.g. yourfirm.cafirmops.in).";
    }

    const user = await loginWithBackend(normalizedEmail, password, firmSlug);
    if (!user) {
      return "Invalid email or password.";
    }

    // Set the session cookie without Auth.js building an absolute redirect URL
    // (behind Docker/proxy that can produce an unreachable host after login).
    const result = await signIn("credentials", {
      email: user.email,
      password: "verified",
      id: user.id,
      name: user.name,
      role: user.role,
      firmId: user.firmId,
      token: Buffer.from(user.backendToken, "utf8").toString("base64url"),
      redirect: false,
    });
    if (result?.error) {
      logger.error("signIn returned error", { host, firmSlug, error: result.error });
      return "Sign-in failed. Clear cookies and try again.";
    }

    return undefined;
  } catch (error) {
    logger.error("authenticate failed", { error });
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Sign-in failed. Please try again.";
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Not signed in." };
  const result = await apiMutate("POST", "/api/auth/change-password", input, token);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
