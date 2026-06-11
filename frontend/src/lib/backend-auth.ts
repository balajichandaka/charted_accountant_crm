import type { Role } from "@/types/domain";

export type BackendLoginUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  backendToken: string;
};

export async function loginWithBackend(
  email: string,
  password: string
): Promise<BackendLoginUser | null> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });

      const text = await res.text();
      let json: {
        ok: boolean;
        data?: {
          token: string;
          user: { id: string; name: string; email: string; role: Role };
        };
      };
      try {
        json = JSON.parse(text);
      } catch {
        if (attempt === 0) continue;
        return null;
      }

      if (json.ok && json.data?.user && json.data.token) {
        return { ...json.data.user, backendToken: json.data.token };
      }

      return null;
    } catch {
      if (attempt === 0) continue;
      return null;
    }
  }

  return null;
}
