-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "subtaskId" TEXT;

-- CreateIndex
CREATE INDEX "TimeEntry_subtaskId_idx" ON "TimeEntry"("subtaskId");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "TicketSubtask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
