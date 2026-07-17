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
  isActive: z.boolean().optional(),
});
const clean = (v?: string | string[] | null): string | null => { const s = Array.isArray(v) ? v[0] : v; return s?.trim() || null; };

// Distinct, brand-friendly palette for categories created without an explicit color
// (e.g. the quick "+ New category" flow while building a work template).
const CATEGORY_COLOR_PALETTE = [
  "#2563eb", // blue
  "#0d9488", // teal
  "#d97706", // amber
  "#7c3aed", // violet
  "#e11d48", // rose
  "#059669", // emerald
  "#db2777", // pink
  "#4f46e5", // indigo
  "#ea580c", // orange
  "#0891b2", // cyan
  "#16a34a", // green
  "#ca8a04", // gold
  "#9333ea", // purple
  "#be123c", // crimson
  "#0284c7", // sky
  "#65a30d", // lime
  "#c026d3", // fuchsia
  "#92400e", // brown
];
const randomCategoryColor = () => CATEGORY_COLOR_PALETTE[Math.floor(Math.random() * CATEGORY_COLOR_PALETTE.length)];

router.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tickets: true } } },
    });
    res.json({ ok: true, data: categories });
  } catch (err) { next(err); }
});

// POST / (create) is open to any authenticated firm member — e.g. creating a category inline
// while defining a work template. Edit/deactivate/delete stay CA-only below.
router.post("/", async (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message }); return; }
    const exists = await prisma.category.findFirst({ where: { name: parsed.data.name } });
    if (exists) { res.status(400).json({ ok: false, error: "Category name already exists." }); return; }
    const category = await prisma.category.create({ data: { firmId: req.user!.firm, name: String(parsed.data.name), description: clean(String(parsed.data.description || "")), colorHex: clean(String(parsed.data.colorHex || "")) ?? randomCategoryColor(), isActive: parsed.data.isActive ?? true } });
    res.json({ ok: true, data: { id: category.id, name: category.name } });
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
