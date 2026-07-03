import { Router } from "express";
import { generateRecurringTickets } from "../lib/recurrence";
import { basePrisma } from "../lib/prisma";
import { runWithFirm } from "../lib/tenant-context";

const router = Router();
const SECRET = process.env.CRON_SECRET ?? "";

router.post("/recurring", async (req, res, next) => {
  try {
    const auth = req.headers.authorization ?? "";
    if (!SECRET || auth !== `Bearer ${SECRET}`) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    // Run the recurring sweep independently for every active firm, each inside
    // its own tenant context so generation stays firm-scoped.
    const firms = await basePrisma.firm.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const totals = { generated: 0, skipped: 0, errors: [] as string[] };
    for (const firm of firms) {
      const result = await runWithFirm(firm.id, async () => await generateRecurringTickets());
      totals.generated += result.generated;
      totals.skipped += result.skipped;
      totals.errors.push(...result.errors.map((e) => `firm ${firm.id}: ${e}`));
    }

    res.json({ ok: true, data: totals });
  } catch (err) {
    next(err);
  }
});

export default router;
