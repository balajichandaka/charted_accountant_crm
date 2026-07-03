import { PrismaClient } from "@prisma/client";
import { getFirmId } from "./tenant-context";

const globalForPrisma = globalThis as unknown as {
  basePrisma: PrismaClient | undefined;
};

// The raw, UN-scoped client. Only for system-level work that must cross firms:
// login (resolve firm + user), cron (loop all firms), platform provisioning,
// and loading a user by id inside authMiddleware. Never use this in a normal
// request path — use the scoped `prisma` export below.
export const basePrisma =
  globalForPrisma.basePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.basePrisma = basePrisma;
}

// Models that have no `firmId` column and therefore are not row-scoped by firmId.
const UNSCOPED_MODELS = new Set(["Firm"]);

const READ_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const WHERE_WRITE_OPS = new Set(["update", "updateMany", "delete", "deleteMany"]);

/**
 * Recursively stamp `firmId` onto a create payload and any nested create /
 * createMany / connectOrCreate / upsert.create payloads. Because every model
 * carries firmId (NOT NULL), nested writes (e.g. ticket -> subtasks/activities)
 * must be stamped too. An explicitly-provided firmId/firm is left untouched.
 */
function stampCreateData(payload: unknown, firmId: string): void {
  if (payload == null || typeof payload !== "object") return;
  if (Array.isArray(payload)) {
    for (const item of payload) stampCreateData(item, firmId);
    return;
  }
  const record = payload as Record<string, unknown>;
  if (record.firmId === undefined && record.firm === undefined) {
    record.firmId = firmId;
  }
  for (const value of Object.values(record)) {
    if (value == null || typeof value !== "object" || value instanceof Date) continue;
    const rel = value as Record<string, unknown>;
    if (rel.create !== undefined) stampCreateData(rel.create, firmId);
    if (
      rel.createMany !== undefined &&
      typeof rel.createMany === "object" &&
      (rel.createMany as Record<string, unknown>).data !== undefined
    ) {
      stampCreateData((rel.createMany as Record<string, unknown>).data, firmId);
    }
    if (rel.connectOrCreate !== undefined) {
      const list = Array.isArray(rel.connectOrCreate)
        ? rel.connectOrCreate
        : [rel.connectOrCreate];
      for (const c of list) {
        if (c && typeof c === "object" && (c as Record<string, unknown>).create) {
          stampCreateData((c as Record<string, unknown>).create, firmId);
        }
      }
    }
    if (rel.upsert !== undefined) {
      const list = Array.isArray(rel.upsert) ? rel.upsert : [rel.upsert];
      for (const u of list) {
        if (u && typeof u === "object" && (u as Record<string, unknown>).create) {
          stampCreateData((u as Record<string, unknown>).create, firmId);
        }
      }
    }
  }
}

/** Atomically allocate the next per-firm ticket number. */
async function nextTicketNumber(firmId: string): Promise<number> {
  const firm = await basePrisma.firm.update({
    where: { id: firmId },
    data: { ticketSeq: { increment: 1 } },
    select: { ticketSeq: true },
  });
  return firm.ticketSeq;
}

// The firm-scoped client used everywhere in request handlers. It fails closed:
// any scoped-model query with no firm context throws rather than reading across
// tenants.
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const firmId = getFirmId();
        const a = (args ?? {}) as Record<string, any>;

        // Firm itself has no firmId; scope reads/writes to the caller's own firm.
        if (UNSCOPED_MODELS.has(model)) {
          if (firmId && operation !== "create" && operation !== "createMany") {
            a.where = { ...(a.where ?? {}), id: firmId };
          }
          return query(a);
        }

        if (!firmId) {
          throw new Error(
            `Tenant isolation: ${model}.${operation} attempted with no firm context.`
          );
        }

        if (READ_OPS.has(operation) || WHERE_WRITE_OPS.has(operation)) {
          a.where = { ...(a.where ?? {}), firmId };
        }

        if (operation === "create") {
          if (model === "Ticket" && a.data && a.data.ticketNumber === undefined) {
            a.data.ticketNumber = await nextTicketNumber(firmId);
          }
          stampCreateData(a.data, firmId);
        } else if (operation === "createMany") {
          if (model === "Ticket") {
            const rows = Array.isArray(a.data) ? a.data : [a.data];
            for (const row of rows) {
              if (row && row.ticketNumber === undefined) {
                row.ticketNumber = await nextTicketNumber(firmId);
              }
            }
          }
          stampCreateData(a.data, firmId);
        } else if (operation === "update" || operation === "updateMany") {
          stampCreateData(a.data, firmId);
        } else if (operation === "upsert") {
          if (model === "Ticket" && a.create && a.create.ticketNumber === undefined) {
            a.create.ticketNumber = await nextTicketNumber(firmId);
          }
          stampCreateData(a.create, firmId);
          stampCreateData(a.update, firmId);
        }

        return query(a);
      },
    },
  },
});
