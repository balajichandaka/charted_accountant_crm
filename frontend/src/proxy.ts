// Next.js 16 "proxy" convention (formerly middleware). The re-export form is
// statically analyzable so Next can detect the request handler.
export { auth as proxy } from "@/lib/edge-auth";

// Run on all routes except Next internals, the auth API, cron APIs
// (which authenticate via their own secret), the platform console (which uses
// its own super-admin cookie auth), and static assets.
export const config = {
  matcher: [
    "/((?!platform|api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
