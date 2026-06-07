import type { Role } from "@/types/domain";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    backendToken?: string;
  }

  interface Session {
    backendToken?: string;
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    backendToken?: string;
  }
}
