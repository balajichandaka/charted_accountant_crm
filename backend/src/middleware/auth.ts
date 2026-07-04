import type { Request, Response, NextFunction } from "express";
import { basePrisma } from "../lib/prisma";
import { runWithFirm } from "../lib/tenant-context";
import { verifyToken, type JwtPayload } from "../lib/jwt";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(header.slice(7));
  } catch (err) {
    logger.debug({ err }, "token verification failed");
    res.status(401).json({ ok: false, error: "Invalid or expired token" });
    return;
  }

  // Load the user by id with the UN-scoped client (there is no firm context yet),
  // then verify the token's firm matches the user's firm and the firm is active.
  const user = await basePrisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      isActive: true,
      firmId: true,
      firm: { select: { isActive: true } },
    },
  });

  if (
    !user ||
    !user.isActive ||
    !user.firm?.isActive ||
    user.firmId !== payload.firm
  ) {
    logger.debug(
      {
        userId: payload.sub,
        found: !!user,
        userActive: user?.isActive,
        firmActive: user?.firm?.isActive,
        firmMatch: user?.firmId === payload.firm,
      },
      "auth rejected: session/firm mismatch"
    );
    res.status(401).json({
      ok: false,
      error: "Session invalid for this environment. Please log out and sign in again.",
    });
    return;
  }

  req.user = {
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    firm: user.firmId,
  };

  // Enter the tenant context for the rest of the request so every scoped Prisma
  // query auto-filters to this firm. Downstream async handlers keep the context
  // across their awaits.
  runWithFirm(user.firmId, () => next());
}

export function requireCA(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "CA") {
    res.status(403).json({ ok: false, error: "CA access required" });
    return;
  }
  next();
}

export function requireLeadership(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role !== "CA" && role !== "MANAGER") {
    res.status(403).json({ ok: false, error: "CA or Manager access required." });
    return;
  }
  next();
}
