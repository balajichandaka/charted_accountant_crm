import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { logger } from "../lib/logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      const field = String(err.meta?.field_name ?? "");
      if (field.includes("userId")) {
        res.status(401).json({
          ok: false,
          error: "Session invalid for this environment. Please log out and sign in again.",
        });
        return;
      }
      if (field.includes("ticketId")) {
        res.status(404).json({ ok: false, error: "Ticket not found." });
        return;
      }
    }
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  // Log the full error (with stack) against the request's correlation id.
  (req.log ?? logger).error({ err }, "request failed");
  res.status(500).json({ ok: false, error: message });
}
