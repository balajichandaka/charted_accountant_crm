import type { Role } from "@/types/domain";
import { logger } from "@/lib/logger";

export type BackendLoginUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  firmId: string;
  backendToken: string;
};

export async function loginWithBackend(
  email: string,
  password: string,
  firmSlug: string
): Promise<BackendLoginUser | null> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
  if (!firmSlug) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firmSlug }),
        cache: "no-store",
      });

      const text = await res.text();
      let json: {
        ok: boolean;
        error?: string;
        data?: {
          token: string;
          user: { id: string; name: string; email: string; role: Role; firmId: string };
        };
      };
      try {
        json = JSON.parse(text);
      } catch {
        logger.error("backend login returned non-JSON", {
          backendUrl,
          status: res.status,
          body: text.slice(0, 200),
        });
        if (attempt === 0) continue;
        return null;
      }

      if (json.ok && json.data?.user && json.data.token) {
        return { ...json.data.user, backendToken: json.data.token };
      }

      if (res.status >= 500) {
        const msg = typeof json.error === "string" ? json.error : text.slice(0, 200);
        throw new Error(`Login service error (${res.status}): ${msg}`);
      }

      return null;
    } catch (err) {
      logger.error("failed to reach backend for login", {
        backendUrl,
        attempt: attempt + 1,
        error: err,
      });
      if (attempt === 0) continue;
      return null;
    }
  }

  return null;
}
