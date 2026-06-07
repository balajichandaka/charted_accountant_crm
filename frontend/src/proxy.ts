// Next.js 16 "proxy" convention (formerly middleware). The re-export form is
// statically analyzable so Next can detect the request handler.
export { auth as proxy } from "@/lib/edge-auth";

// Run on all routes except Next internals, the auth API, cron APIs
// (which authenticate via their own secret), and static assets.
export const config = {
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
