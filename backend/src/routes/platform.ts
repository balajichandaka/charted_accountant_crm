import { Router } from "express";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { basePrisma } from "../lib/prisma";
import { signPlatformToken } from "../lib/platform-jwt";
import { platformAuthMiddleware } from "../middleware/platform-auth";
import { provisionFirm } from "../lib/provision";

const router = Router();

// ── Public: platform-admin login ──────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Invalid email or password." });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const admin = await basePrisma.platformAdmin.findUnique({ where: { email } });
    if (!admin || !admin.isActive || !bcrypt.compareSync(parsed.data.password, admin.passwordHash)) {
      res.status(401).json({ ok: false, error: "Invalid email or password." });
      return;
    }
    const token = signPlatformToken({ sub: admin.id, email: admin.email, name: admin.name });
    res.json({ ok: true, data: { token, admin: { id: admin.id, name: admin.name, email: admin.email } } });
  } catch (err) {
    next(err);
  }
});

// ── Everything below requires a valid platform-admin token ─────────────────
router.use(platformAuthMiddleware);

// GET /api/platform/firms — list all firms with usage counts + primary CA email.
router.get("/firms", async (_req, res, next) => {
  try {
    const firms = await basePrisma.firm.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, clients: true, tickets: true } },
        // The firm's first/owner CA — shown so the operator knows the login email.
        users: {
          where: { role: "CA" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { email: true },
        },
      },
    });
    const data = firms.map(({ users, ...f }) => ({ ...f, caEmail: users[0]?.email ?? null }));
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// A readable random password for handoff (no ambiguous chars).
function generatePassword(len = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// POST /api/platform/firms/:id/reset-ca-password — set a NEW temp password for
// the firm's primary CA (plaintext is never stored). The admin previews the new
// password in the UI and confirms; that value is sent here so the applied
// password matches exactly what was shown. Falls back to a server-generated one.
const resetSchema = z.object({ password: z.string().min(8).optional() });

router.post("/firms/:id/reset-ca-password", async (req, res, next) => {
  try {
    const parsed = resetSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
      return;
    }
    const ca = await basePrisma.user.findFirst({
      where: { firmId: req.params.id, role: "CA" },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    });
    if (!ca) {
      res.status(404).json({ ok: false, error: "No CA found for this firm." });
      return;
    }
    const password = parsed.data.password ?? generatePassword();
    await basePrisma.user.update({
      where: { id: ca.id },
      data: { passwordHash: bcrypt.hashSync(password, 10) },
    });
    res.json({ ok: true, data: { email: ca.email, password } });
  } catch (err) {
    next(err);
  }
});

// POST /api/platform/firms — provision a firm + its first CA.
const createFirmSchema = z.object({
  firmName: z.string().min(1),
  slug: z.string().min(2),
  caName: z.string().min(1),
  caEmail: z.string().email(),
  caPassword: z.string().min(8),
  brandName: z.string().optional(),
});

router.post("/firms", async (req, res, next) => {
  try {
    const parsed = createFirmSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message });
      return;
    }
    const result = await provisionFirm(parsed.data);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    next(err);
  }
});

// PATCH /api/platform/firms/:id — suspend / re-activate a firm (no deletes).
const patchSchema = z.object({ isActive: z.boolean() });

router.patch("/firms/:id", async (req, res, next) => {
  try {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "isActive (boolean) is required." });
      return;
    }
    const existing = await basePrisma.firm.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) {
      res.status(404).json({ ok: false, error: "Firm not found." });
      return;
    }
    const firm = await basePrisma.firm.update({
      where: { id: req.params.id },
      data: { isActive: parsed.data.isActive },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    res.json({ ok: true, data: firm });
  } catch (err) {
    next(err);
  }
});

export default router;
