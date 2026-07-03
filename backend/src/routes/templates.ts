import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireCA } from "../middleware/auth";

const router = Router();
router.use(authMiddleware, requireCA);

const templateSchema = z.object({
  name: z.string().trim().min(1),
  categoryId: z.string().min(1),
  description: z.string().trim().optional().or(z.literal("")),
  documentsRequired: z.string().trim().optional().or(z.literal("")),
  defaultFrequency: z.enum(["ONE_TIME","WEEKLY","MONTHLY","QUARTERLY","HALF_YEARLY","YEARLY","CUSTOM"]),
  defaultBillable: z.enum(["BILLABLE","NON_BILLABLE"]),
  defaultPriority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]),
  subtasks: z.array(z.object({ title: z.string().trim().min(1) })).default([]),
});
const clean = (v?: string) => (v?.trim() ? v.trim() : null);

router.get("/", async (_req, res, next) => {
  try {
    const templates = await prisma.workTemplate.findMany({
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      include: { category: true, _count: { select: { subtasks: true } } },
    });
    res.json({ ok: true, data: templates });
  } catch (err) { next(err); }
});

router.get("/form-data", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    res.json({ ok: true, data: { categories } });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const template = await prisma.workTemplate.findUnique({ where: { id: req.params.id }, include: { subtasks: { orderBy: { order: "asc" } } } });
    if (!template) { res.status(404).json({ ok: false, error: "Not found" }); return; }
    res.json({ ok: true, data: template });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const d = parsed.data!;
    const firmId = req.user!.firm;
    const tmpl = await prisma.workTemplate.create({ data: { firmId, name: d.name, categoryId: d.categoryId, description: clean(d.description), documentsRequired: clean(d.documentsRequired), defaultFrequency: d.defaultFrequency, defaultBillable: d.defaultBillable, defaultPriority: d.defaultPriority, subtasks: { create: d.subtasks.map((s, i) => ({ firmId, title: s.title, order: i })) } } });
    res.json({ ok: true, data: { id: tmpl.id } });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const d = parsed.data!;
    const firmId = req.user!.firm;
    await prisma.$transaction([
      prisma.templateSubtask.deleteMany({ where: { templateId: req.params.id } }),
      prisma.workTemplate.update({ where: { id: req.params.id }, data: { name: d.name, categoryId: d.categoryId, description: clean(d.description), documentsRequired: clean(d.documentsRequired), defaultFrequency: d.defaultFrequency, defaultBillable: d.defaultBillable, defaultPriority: d.defaultPriority, subtasks: { create: d.subtasks.map((s, i) => ({ firmId, title: s.title, order: i })) } } }),
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch("/:id/active", async (req, res, next) => {
  try {
    await prisma.workTemplate.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/templates/:id  (CA only — permanent).
// Blocked if any recurring schedule depends on it (required FK). Otherwise the
// template's subtasks cascade, and previously generated tickets are kept but
// unlinked (templateId is optional).
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const target = await prisma.workTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!target) { res.status(404).json({ ok: false, error: "Template not found." }); return; }

    const schedules = await prisma.recurringSchedule.count({ where: { templateId: id } });
    if (schedules) {
      res.status(409).json({
        ok: false,
        error: `Cannot delete: this template is used by ${schedules} recurring schedule${schedules === 1 ? "" : "s"}. Delete the schedule${schedules === 1 ? "" : "s"} first, then delete the template.`,
        details: { schedules },
      });
      return;
    }

    await prisma.$transaction([
      prisma.ticket.updateMany({ where: { templateId: id }, data: { templateId: null } }),
      prisma.workTemplate.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
