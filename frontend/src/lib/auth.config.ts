import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import type { Role } from "@/types/domain";
import { firmSlugFromHost } from "@/lib/tenant";

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

function isBackendTokenUsable(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
    return false;
  }
  return true;
}

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const hasBackendToken = !!auth?.backendToken;
      const isLoginPage = nextUrl.pathname === "/login";

      // Resolve the firm (tenant) from the subdomain and forward it as a trusted
      // request header. We always set/clear it here so a client can't spoof it.
      const slug = firmSlugFromHost(request.headers.get("host"));
      const requestHeaders = new Headers(request.headers);
      if (slug) requestHeaders.set("x-firm-slug", slug);
      else requestHeaders.delete("x-firm-slug");
      const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

      if (isLoginPage) {
        // Only redirect away from login if the session is fully valid.
        if (isLoggedIn && hasBackendToken) {
          // Stay on login while recovering from a stale/invalid backend token.
          if (nextUrl.searchParams.get("reauth") === "1") return pass();
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return pass();
      }

      // Protected page: require both a user AND a backend token.
      return isLoggedIn && hasBackendToken ? pass() : false;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        token.firmId = user.firmId;
        token.backendToken = user.backendToken;
      }
      if (
        typeof token.backendToken === "string" &&
        !isBackendTokenUsable(token.backendToken)
      ) {
        delete token.backendToken;
      }
      return token;
    },
    session({ session, token }) {
      // Expose everything the frontend needs from the JWT token.
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.firmId = token.firmId as string | undefined;
      session.backendToken = token.backendToken as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
