import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
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
