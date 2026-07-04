import { logger } from "./logger";
import { runRecurringSweepForAllFirms } from "./recurring-sweep";

const DEFAULT_INTERVAL_MS = 60_000;
const STARTUP_DELAY_MS = 5_000;

function parseIntervalMs(): number {
  const raw = process.env.RECURRING_POLL_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 10_000) {
    logger.warn(
      { raw, minMs: 10_000 },
      "RECURRING_POLL_INTERVAL_MS invalid — using 60s default (minimum 10s)"
    );
    return DEFAULT_INTERVAL_MS;
  }
  return n;
}

/** Poll for due recurring schedules and generate tickets without manual / cron HTTP calls. */
export function startRecurringScheduler(): void {
  if (process.env.RECURRING_SCHEDULER_ENABLED === "false") {
    logger.info("recurring scheduler disabled (RECURRING_SCHEDULER_ENABLED=false)");
    return;
  }

  const intervalMs = parseIntervalMs();
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runRecurringSweepForAllFirms();
      if (result.generated > 0 || result.errors.length > 0) {
        logger.info(result, "recurring sweep completed");
      }
    } catch (err) {
      logger.error({ err }, "recurring sweep failed");
    } finally {
      running = false;
    }
  };

  logger.info({ intervalMs, startupDelayMs: STARTUP_DELAY_MS }, "recurring scheduler started");
  setTimeout(() => void tick(), STARTUP_DELAY_MS);
  setInterval(() => void tick(), intervalMs);
}
