import { redirect } from "next/navigation";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  // No token means not authenticated — send to login instead of crashing.
  if (!token) redirect("/login");

  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // 401 from backend means token expired or invalid — redirect to login.
  if (res.status === 401) redirect("/login");

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
