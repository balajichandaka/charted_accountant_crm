import { Router } from "express";
import { generateRecurringTickets } from "../lib/recurrence";

const router = Router();
const SECRET = process.env.CRON_SECRET ?? "";

router.post("/recurring", async (req, res, next) => {
  try {
    const auth = req.headers.authorization ?? "";
    if (!SECRET || auth !== `Bearer ${SECRET}`) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const result = await generateRecurringTickets();
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
});

export default router;
