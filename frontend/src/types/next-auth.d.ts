import type { Role } from "@/types/domain";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    firmId?: string;
    backendToken?: string;
  }

  interface Session {
    backendToken?: string;
    user: {
      id: string;
      role: Role;
      firmId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    firmId?: string;
    backendToken?: string;
  }
}
