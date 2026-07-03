// Resolve which firm (tenant) a request belongs to from its Host header.
// Pure string logic so it is safe to use in both the edge middleware (proxy.ts)
// and server actions/components.
//
// Production:  <slug>.cafirmops.in            -> "<slug>"
//              cafirmops.in / www.cafirmops.in -> null (marketing)
//              admin.cafirmops.in              -> null (platform surface)
// Local dev:   <slug>.localhost:3000          -> "<slug>"
//              localhost:3000                  -> NEXT_PUBLIC_DEFAULT_FIRM_SLUG (if set), else null

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cafirmops.in").toLowerCase();
const DEFAULT_DEV_SLUG = process.env.NEXT_PUBLIC_DEFAULT_FIRM_SLUG?.toLowerCase() || null;

// Subdomains reserved for shared surfaces — never a firm.
export const RESERVED_SLUGS = new Set(["www", "app", "admin", "api"]);

export function firmSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase().trim();

  let sub: string | null = null;
  if (hostname.endsWith(".localhost")) {
    sub = hostname.slice(0, -".localhost".length);
  } else if (hostname === "localhost" || hostname === "127.0.0.1") {
    return DEFAULT_DEV_SLUG;
  } else if (hostname.endsWith("." + ROOT_DOMAIN)) {
    sub = hostname.slice(0, -("." + ROOT_DOMAIN).length);
  } else {
    // bare root domain, an IP, or an unknown host — no firm
    return DEFAULT_DEV_SLUG;
  }

  if (!sub) return null;
  // single-level subdomain only (wildcard certs cover one level)
  sub = sub.split(".")[0];
  if (!sub || RESERVED_SLUGS.has(sub)) return null;
  return sub;
}
