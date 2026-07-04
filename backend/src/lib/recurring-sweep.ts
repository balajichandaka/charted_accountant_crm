import { generateRecurringTickets } from "./recurrence";
import { basePrisma } from "./prisma";
import { runWithFirm } from "./tenant-context";

export type RecurringSweepTotals = {
  generated: number;
  skipped: number;
  errors: string[];
};

/** Run recurring generation for every active firm (same logic as POST /api/cron/recurring). */
export async function runRecurringSweepForAllFirms(): Promise<RecurringSweepTotals> {
  const firms = await basePrisma.firm.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const totals: RecurringSweepTotals = { generated: 0, skipped: 0, errors: [] };
  for (const firm of firms) {
    const result = await runWithFirm(firm.id, async () => await generateRecurringTickets());
    totals.generated += result.generated;
    totals.skipped += result.skipped;
    totals.errors.push(...result.errors.map((e) => `firm ${firm.id}: ${e}`));
  }
  return totals;
}
