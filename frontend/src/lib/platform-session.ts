import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// The platform (super-admin) console keeps its own session — an httpOnly cookie
// holding the platform JWT — completely separate from the per-firm NextAuth
// session. Scoped to /platform so it never collides with firm auth.
const COOKIE = "platform-token";
const COOKIE_PATH = "/platform";

export async function getPlatformToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE)?.value;
}

export async function setPlatformToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH,
    maxAge: 60 * 60 * 24 * 7, // 7 days, matches the token expiry
  });
}

export async function clearPlatformToken(): Promise<void> {
  const store = await cookies();
  store.delete({ name: COOKIE, path: COOKIE_PATH });
}

/** Return the platform token or redirect to the platform login. */
export async function requirePlatformToken(): Promise<string> {
  const token = await getPlatformToken();
  if (!token) redirect("/platform/login");
  return token;
}
