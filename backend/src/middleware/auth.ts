import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken, type JwtPayload } from "../lib/jwt";

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
  try {
    const payload = verifyToken(header.slice(7));
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, name: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) {
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
    };
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
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
