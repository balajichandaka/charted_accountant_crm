import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types/domain";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // backendToken is our indicator of a valid, post-fix session.
      // Old sessions (pre-fix cookies) won't have it and must re-login.
      const hasBackendToken = !!(auth as { backendToken?: string } | null)
        ?.backendToken;
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoginPage) {
        // Only redirect away from login if the session is fully valid.
        if (isLoggedIn && hasBackendToken) {
          // Avoid loops when an expired backend token bounces back from a protected page.
          if (nextUrl.searchParams.get("reauth") === "1") return true;
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // Protected page: require both a user AND a backend token.
      // Stale sessions (no backendToken) are treated as unauthenticated.
      return isLoggedIn && hasBackendToken;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        // Store the backend JWT so RSC pages can authenticate against the API.
        token.backendToken = user.backendToken;
      }
      return token;
    },
    session({ session, token }) {
      // Expose everything the frontend needs from the JWT token.
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.backendToken = token.backendToken as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
