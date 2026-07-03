import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireCA } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  colorHex: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional().or(z.literal("")),
});
const clean = (v?: string | string[] | null): string | null => { const s = Array.isArray(v) ? v[0] : v; return s?.trim() || null; };

router.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tickets: true } } },
    });
    res.json({ ok: true, data: categories });
  } catch (err) { next(err); }
});

router.post("/", requireCA, async (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const exists = await prisma.category.findFirst({ where: { name: parsed.data.name } });
    if (exists) { res.status(400).json({ ok: false, error: "Category name already exists." }); return; }
    await prisma.category.create({ data: { firmId: req.user!.firm, name: String(parsed.data.name), description: clean(String(parsed.data.description || "")), colorHex: clean(String(parsed.data.colorHex || "")) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.put("/:id", requireCA, async (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    await prisma.category.update({ where: { id: req.params.id }, data: { name: String(parsed.data.name), description: clean(String(parsed.data.description || "")), colorHex: clean(String(parsed.data.colorHex || "")) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch("/:id/active", requireCA, async (req, res, next) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/categories/:id  (CA only — permanent).
// Blocked if any work template depends on it (required FK). Otherwise tickets in
// this category are kept but un-categorized (categoryId is optional).
router.delete("/:id", requireCA, async (req, res, next) => {
  try {
    const id = req.params.id;
    const target = await prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!target) { res.status(404).json({ ok: false, error: "Category not found." }); return; }

    const templates = await prisma.workTemplate.count({ where: { categoryId: id } });
    if (templates) {
      res.status(409).json({
        ok: false,
        error: `Cannot delete: this category is used by ${templates} work template${templates === 1 ? "" : "s"}. Move or delete ${templates === 1 ? "it" : "them"} first, then delete the category.`,
        details: { templates },
      });
      return;
    }

    await prisma.$transaction([
      prisma.ticket.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
      prisma.category.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
