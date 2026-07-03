import type { Request, Response, NextFunction } from "express";
import { basePrisma } from "../lib/prisma";
import { verifyPlatformToken, type PlatformJwtPayload } from "../lib/platform-jwt";

declare global {
  namespace Express {
    interface Request {
      platformAdmin?: PlatformJwtPayload;
    }
  }
}

// Guards the platform (super-admin) console API. Unlike authMiddleware it never
// enters a firm tenant context — platform admins operate across all firms via
// basePrisma.
export async function platformAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  let payload: PlatformJwtPayload;
  try {
    payload = verifyPlatformToken(header.slice(7));
  } catch {
    res.status(401).json({ ok: false, error: "Invalid or expired token" });
    return;
  }

  const admin = await basePrisma.platformAdmin.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!admin || !admin.isActive) {
    res.status(401).json({ ok: false, error: "Session invalid. Please sign in again." });
    return;
  }

  req.platformAdmin = { sub: admin.id, email: admin.email, name: admin.name, kind: "platform" };
  next();
}
