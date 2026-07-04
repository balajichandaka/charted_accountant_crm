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
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return "Invalid email or password.";
  }

  // Resolve which firm this login is for from the subdomain the user is on.
  const headerList = await headers();
  const firmSlug = firmSlugFromHost(
    headerList.get("x-firm-slug") ?? headerList.get("host")
  );
  if (!firmSlug) {
    return "This sign-in page is not associated with a firm. Use your firm's address (e.g. yourfirm.cafirmops.in).";
  }

  const user = await loginWithBackend(email.trim(), password, firmSlug);
  if (!user) {
    return "Invalid email or password.";
  }

  try {
    await signIn("credentials", {
      email: user.email,
      password: "verified",
      id: user.id,
      name: user.name,
      role: user.role,
      firmId: user.firmId,
      token: Buffer.from(user.backendToken, "utf8").toString("base64url"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // A successful signIn throws a Next.js redirect — let it propagate untouched.
    if (isNextRedirect(error)) throw error;
    if (error instanceof AuthError) {
      logger.warn("login signIn rejected", { firmSlug, type: error.type });
      return "Invalid email or password.";
    }
    // Anything else is a real server-side failure (missing AUTH_SECRET, config
    // error, etc.). Log it so the cause is visible, then surface a 500.
    logger.error("login signIn failed", { firmSlug, error });
    throw error;
  }
}

/** True for the redirect "error" Next.js throws on a successful server-action redirect. */
function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
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
