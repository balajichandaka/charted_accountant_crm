import { signOut } from "@/lib/auth";

/** Wipe NextAuth cookies and send the user to login (avoids redirect loops). */
export async function GET() {
  await signOut({ redirectTo: "/login?reauth=1" });
}
