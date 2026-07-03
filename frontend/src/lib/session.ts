import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isBackendTokenUsable } from "@/lib/backend-token";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "CA" | "MANAGER" | "EMPLOYEE";
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function getToken(): Promise<string | undefined> {
  const session = await auth();
  return session?.backendToken;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isBackendTokenUsable(session.backendToken)) redirect("/api/auth/clear-session");
  return session.user as SessionUser;
}

export async function requireCA(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "CA") redirect("/dashboard");
  return user;
}

export async function requireLeadership(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "CA" && user.role !== "MANAGER") redirect("/timesheet");
  return user;
}
