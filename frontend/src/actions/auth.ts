"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { loginWithBackend } from "@/lib/backend-auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return "Invalid email or password.";
  }

  const user = await loginWithBackend(email.trim(), password);
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
      token: Buffer.from(user.backendToken, "utf8").toString("base64url"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
