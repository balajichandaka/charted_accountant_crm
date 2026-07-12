import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireCA } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const clientSchema = z.object({
  name: z.string().trim().min(1),
  companyName: z.string().trim().optional().or(z.literal("")),
  gstNumber: z.string().trim().optional().or(z.literal("")),
  billTo: z.string().trim().optional().or(z.literal("")),
  shipTo: z.string().trim().optional().or(z.literal("")),
  rcm: z.boolean().default(false),
  creditPeriodDays: z.coerce.number().int().min(0).max(365).optional(),
  state: z.string().trim().optional().or(z.literal("")),
  fullAddress: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

const clean = (v?: string | string[] | null): string | null => { const s = Array.isArray(v) ? v[0] : v; return s?.trim() || null; };

router.get("/", async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { _count: { select: { tickets: true } } },
    });
    res.json({ ok: true, data: clients });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { tickets: { orderBy: { createdAt: "desc" }, include: { assignee: true } } },
    });
    if (!client) { res.status(404).json({ ok: false, error: "Client not found" }); return; }
    res.json({ ok: true, data: client });
  } catch (err) { next(err); }
});

// Any firm member (CA, manager or employee) can add a client; edits/deactivation
// stay CA-only below. Creation is firm-scoped via req.user.firm regardless of role.
router.post("/", async (req, res, next) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: "Validation failed" }); return; }
    const d = parsed.data!;
    const client = await prisma.client.create({
      data: { firmId: req.user!.firm, name: d.name, companyName: clean(d.companyName as string | undefined), gstNumber: clean(d.gstNumber as string | undefined), billTo: clean(d.billTo as string | undefined), shipTo: clean(d.shipTo as string | undefined), rcm: d.rcm, creditPeriodDays: d.creditPeriodDays ?? null, state: clean(d.state as string | undefined), fullAddress: clean(d.fullAddress as string | undefined), email: clean(d.email as string | undefined), phone: clean(d.phone as string | undefined), notes: clean(d.notes as string | undefined) },
    });
    res.json({ ok: true, data: { id: client.id } });
  } catch (err) { next(err); }
});

router.put("/:id", requireCA, async (req, res, next) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: "Validation failed" }); return; }
    const d = parsed.data!;
    await prisma.client.update({ where: { id: req.params.id }, data: { name: d.name, companyName: clean(d.companyName as string | undefined), gstNumber: clean(d.gstNumber as string | undefined), billTo: clean(d.billTo as string | undefined), shipTo: clean(d.shipTo as string | undefined), rcm: d.rcm, creditPeriodDays: d.creditPeriodDays ?? null, state: clean(d.state as string | undefined), fullAddress: clean(d.fullAddress as string | undefined), email: clean(d.email as string | undefined), phone: clean(d.phone as string | undefined), notes: clean(d.notes as string | undefined) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch("/:id/active", requireCA, async (req, res, next) => {
  try {
    await prisma.client.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/clients/:id  (CA only — permanent).
// Blocked if any ticket or recurring schedule depends on it (both required FKs).
// Clients with history should be deactivated instead.
router.delete("/:id", requireCA, async (req, res, next) => {
  try {
    const id = req.params.id;
    const target = await prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!target) { res.status(404).json({ ok: false, error: "Client not found." }); return; }

    const [tickets, schedules] = await Promise.all([
      prisma.ticket.count({ where: { clientId: id } }),
      prisma.recurringSchedule.count({ where: { clientId: id } }),
    ]);

    if (tickets || schedules) {
      const parts = [
        tickets && `${tickets} ticket${tickets === 1 ? "" : "s"}`,
        schedules && `${schedules} recurring schedule${schedules === 1 ? "" : "s"}`,
      ].filter(Boolean);
      res.status(409).json({
        ok: false,
        error: `Cannot delete: this client has ${parts.join(" and ")}. Deactivate the client instead to keep these records but hide it from new work.`,
        details: { tickets, schedules },
      });
      return;
    }

    await prisma.client.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
