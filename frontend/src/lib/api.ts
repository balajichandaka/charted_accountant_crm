import { signOut } from "@/lib/auth";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

/** Clear NextAuth session before login — avoids redirect loops with stale JWTs. */
async function redirectToSignIn() {
  await signOut({ redirectTo: "/login?reauth=1" });
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  if (!token) await redirectToSignIn();

  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 401) await redirectToSignIn();

  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export async function apiMutate<T = void>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
  token?: string
): Promise<{ ok: true; data?: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json: ApiResponse<T> = await res.json();
    return json;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Multipart upload (no JSON Content-Type so the boundary is set automatically). */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  token?: string
): Promise<{ ok: true; data?: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json: ApiResponse<T> = await res.json();
    return json;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
