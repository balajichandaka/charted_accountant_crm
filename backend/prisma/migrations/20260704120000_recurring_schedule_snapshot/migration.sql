-- Snapshot ticket defaults on recurring schedules so auto-generated tickets match the seed ticket.
ALTER TABLE "RecurringSchedule" ADD COLUMN "title" TEXT;
ALTER TABLE "RecurringSchedule" ADD COLUMN "description" TEXT;
ALTER TABLE "RecurringSchedule" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "RecurringSchedule" ADD COLUMN "managerId" TEXT;
ALTER TABLE "RecurringSchedule" ADD COLUMN "reporterId" TEXT;
ALTER TABLE "RecurringSchedule" ADD COLUMN "priority" "Priority";
ALTER TABLE "RecurringSchedule" ADD COLUMN "billable" "BillableType";
ALTER TABLE "RecurringSchedule" ADD COLUMN "invoiceStatus" "InvoiceStatusNote";
ALTER TABLE "RecurringSchedule" ADD COLUMN "targetMinutes" INTEGER;
ALTER TABLE "RecurringSchedule" ADD COLUMN "documentsRequired" TEXT;
