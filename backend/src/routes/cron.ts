import { Router } from "express";
import { runRecurringSweepForAllFirms } from "../lib/recurring-sweep";

const router = Router();
const SECRET = process.env.CRON_SECRET ?? "";

router.post("/recurring", async (req, res, next) => {
  try {
    const auth = req.headers.authorization ?? "";
    if (!SECRET || auth !== `Bearer ${SECRET}`) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const totals = await runRecurringSweepForAllFirms();
    res.json({ ok: true, data: totals });
  } catch (err) {
    next(err);
  }
});

export default router;
