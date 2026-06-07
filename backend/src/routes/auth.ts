import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Invalid email or password." });
      return;
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ ok: false, error: "Invalid email or password." });
      return;
    }
    const token = signToken({ sub: user.id, role: user.role, name: user.name, email: user.email });
    res.json({ ok: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
  } catch (err) { next(err); }
});

export default router;
