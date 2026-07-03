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
    const exists = await prisma.user.findFirst({ where: { email } });
    if (exists) { res.status(400).json({ ok: false, error: "Email already in use." }); return; }
    await prisma.user.create({ data: { firmId: req.user!.firm, name, email, role, passwordHash: bcrypt.hashSync(password, 10) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const { name, email, role, password } = parsed.data;
    const owner = await prisma.user.findFirst({ where: { email } });
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

// DELETE /api/employees/:id  (CA only — permanent).
// Only employees with NO history can be hard-deleted; otherwise we refuse and
// tell the CA to deactivate instead (preserves billable-hours & audit data).
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (id === req.user?.sub) { res.status(400).json({ ok: false, error: "You cannot delete your own account. Ask another CA to do it." }); return; }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) { res.status(404).json({ ok: false, error: "Employee not found." }); return; }

    const [timeEntries, reported, comments, attachments] = await Promise.all([
      prisma.timeEntry.count({ where: { userId: id } }),
      prisma.ticket.count({ where: { reporterId: id } }),
      prisma.ticketComment.count({ where: { authorId: id } }),
      prisma.attachment.count({ where: { uploadedById: id } }),
    ]);

    if (timeEntries || reported || comments || attachments) {
      const parts = [
        timeEntries && `${timeEntries} time log${timeEntries === 1 ? "" : "s"}`,
        reported && `${reported} created ticket${reported === 1 ? "" : "s"}`,
        comments && `${comments} comment${comments === 1 ? "" : "s"}`,
        attachments && `${attachments} attachment${attachments === 1 ? "" : "s"}`,
      ].filter(Boolean);
      res.status(409).json({
        ok: false,
        error: `Cannot delete: this employee has ${parts.join(", ")}. Deactivate them instead to keep these records but block their login.`,
        details: { timeEntries, reported, comments, attachments },
      });
      return;
    }

    // No history — safe to remove. Null out optional links, then delete.
    await prisma.$transaction([
      prisma.ticket.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } }),
      prisma.ticket.updateMany({ where: { managerId: id }, data: { managerId: null } }),
      prisma.ticketSubtask.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } }),
      prisma.recurringSchedule.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } }),
      prisma.notificationLog.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
