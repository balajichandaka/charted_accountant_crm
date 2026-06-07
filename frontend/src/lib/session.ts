import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "CA" | "EMPLOYEE";
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
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCA(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "CA") redirect("/dashboard");
  return user;
}
