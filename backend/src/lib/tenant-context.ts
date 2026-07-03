import { AsyncLocalStorage } from "node:async_hooks";

// Request-scoped tenant (firm) context. Set once per request by authMiddleware
// (or by system callers that loop per firm), read by the Prisma extension in
// prisma.ts to auto-scope every query. Using AsyncLocalStorage means route
// handlers never have to thread firmId through their queries by hand.

type TenantStore = { firmId: string };

const storage = new AsyncLocalStorage<TenantStore>();

/** Run `fn` (and everything it awaits) with the given firm as the active tenant. */
export function runWithFirm<T>(firmId: string, fn: () => T): T {
  return storage.run({ firmId }, fn);
}

/** Current firm id, or undefined when running outside any tenant context. */
export function getFirmId(): string | undefined {
  return storage.getStore()?.firmId;
}

/** Current firm id, or throw. Use where a firm must be present. */
export function requireFirmId(): string {
  const firmId = storage.getStore()?.firmId;
  if (!firmId) {
    throw new Error(
      "No tenant (firm) context available — a firm-scoped operation ran outside a request."
    );
  }
  return firmId;
}

/** Bind firm context to the current request for all downstream async handlers. */
export function enterFirmContext(firmId: string): void {
  storage.enterWith({ firmId });
}
