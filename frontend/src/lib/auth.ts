import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { loginWithBackend } from "@/lib/backend-auth";
import type { Role } from "@/types/domain";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        id: { type: "text" },
        name: { type: "text" },
        role: { type: "text" },
        firmId: { type: "text" },
        firmSlug: { type: "text" },
        token: { type: "text" },
      },
      async authorize(credentials) {
        const tokenEncoded =
          typeof credentials?.token === "string" ? credentials.token : "";
        const id = typeof credentials?.id === "string" ? credentials.id : "";
        const name = typeof credentials?.name === "string" ? credentials.name : "";
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const role =
          typeof credentials?.role === "string" ? (credentials.role as Role) : undefined;
        const firmId =
          typeof credentials?.firmId === "string" ? credentials.firmId : undefined;

        // Server action already validated credentials against the backend.
        if (tokenEncoded && id && email && role) {
          const backendToken = Buffer.from(tokenEncoded, "base64url").toString("utf8");
          return { id, name, email, role, firmId, backendToken };
        }

        // Fallback direct login path (requires the firm slug to be supplied).
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const firmSlug =
          typeof credentials?.firmSlug === "string" ? credentials.firmSlug : "";
        if (!email || !password || !firmSlug) return null;
        return loginWithBackend(email, password, firmSlug);
      },
    }),
  ],
});
