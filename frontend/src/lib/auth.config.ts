import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import type { Role } from "@/types/domain";
import { isBackendTokenUsable } from "@/lib/backend-token";
import { firmSlugFromHost } from "@/lib/tenant";

function hasValidSession(auth: { user?: unknown; backendToken?: string } | null): boolean {
  return !!auth?.user && isBackendTokenUsable(auth.backendToken);
}

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoginPage = nextUrl.pathname === "/login";
      const sessionOk = hasValidSession(auth);

      // Resolve the firm (tenant) from the subdomain and forward it as a trusted
      // request header. We always set/clear it here so a client can't spoof it.
      const slug = firmSlugFromHost(request.headers.get("host"));
      const requestHeaders = new Headers(request.headers);
      if (slug) requestHeaders.set("x-firm-slug", slug);
      else requestHeaders.delete("x-firm-slug");
      const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

      if (isLoginPage) {
        // Only redirect away from login if the session is fully valid.
        if (sessionOk) {
          // Stay on login while recovering from a stale/invalid backend token.
          if (nextUrl.searchParams.get("reauth") === "1") return pass();
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return pass();
      }

      // Protected page: stay on this host — never return false (Auth.js may redirect
      // to a canonical AUTH_URL on the root domain and cause subdomain loops).
      return sessionOk ? pass() : NextResponse.redirect(new URL("/login", nextUrl));
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
