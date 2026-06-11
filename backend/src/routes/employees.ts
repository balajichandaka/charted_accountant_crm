import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireCA } from "../middleware/auth";

const router = Router();
router.use(authMiddleware, requireCA);

const OPEN = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED"] as const;

const employeeSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.enum(["CA", "MANAGER", "EMPLOYEE"]),
  password: z.string().min(8).optional().or(z.literal("")),
});

router.get("/", async (_req, res, next) => {
  try {
    const [users, openByAssignee] = await Promise.all([
      prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
      prisma.ticket.groupBy({ by: ["assigneeId"], where: { status: { in: [...OPEN] } }, _count: { _all: true } }),
    ]);
    const openMap = new Map(openByAssignee.map((g) => [g.assigneeId, g._count._all]));
    const data = users.map((u) => ({ ...u, openTickets: openMap.get(u.id) ?? 0 }));
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const { name, email, role, password } = parsed.data;
    if (!password) { res.status(400).json({ ok: false, error: "Password is required." }); return; }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) { res.status(400).json({ ok: false, error: "Email already in use." }); return; }
    await prisma.user.create({ data: { name, email, role, passwordHash: bcrypt.hashSync(password, 10) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const { name, email, role, password } = parsed.data;
    const owner = await prisma.user.findUnique({ where: { email } });
    if (owner && owner.id !== req.params.id) { res.status(400).json({ ok: false, error: "Email already in use." }); return; }
    await prisma.user.update({ where: { id: req.params.id }, data: { name, email, role, ...(password ? { passwordHash: bcrypt.hashSync(password, 10) } : {}) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch("/:id/active", async (req, res, next) => {
  try {
    if (req.params.id === req.user?.sub && !req.body.isActive) { res.status(400).json({ ok: false, error: "You cannot deactivate your own account." }); return; }
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
