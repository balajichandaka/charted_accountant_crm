import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { basePrisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // Which firm (tenant) the user is signing in to — resolved from the subdomain
  // by the frontend and forwarded here.
  firmSlug: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Invalid email or password." });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const { password, firmSlug } = parsed.data;

    // Resolve the firm from its slug (un-scoped: no tenant context at login).
    const firm = await basePrisma.firm.findUnique({
      where: { slug: firmSlug },
      select: { id: true, isActive: true },
    });
    if (!firm || !firm.isActive) {
      res.status(401).json({ ok: false, error: "Invalid email or password." });
      return;
    }

    // User is unique per (firm, email).
    const user = await basePrisma.user.findUnique({
      where: { firmId_email: { firmId: firm.id, email } },
    });
    if (!user || !user.isActive || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ ok: false, error: "Invalid email or password." });
      return;
    }

    const token = signToken({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      firm: firm.id,
    });
    res.json({
      ok: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          firmId: firm.id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password — any signed-in user changes their OWN password.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

router.post("/change-password", authMiddleware, async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message });
      return;
    }
    const { currentPassword, newPassword } = parsed.data;

    // Load the current user (firm context is set by authMiddleware).
    const user = await basePrisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, passwordHash: true },
    });
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      res.status(400).json({ ok: false, error: "Current password is incorrect." });
      return;
    }
    if (bcrypt.compareSync(newPassword, user.passwordHash)) {
      res.status(400).json({ ok: false, error: "New password must be different." });
      return;
    }

    await basePrisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bcrypt.hashSync(newPassword, 10) },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
