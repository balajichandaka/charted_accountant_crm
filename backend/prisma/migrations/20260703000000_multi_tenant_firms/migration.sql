-- Multi-tenant conversion: introduce Firm (tenant) and scope all data to it.
-- Existing single-firm data is backfilled into one default firm so the current
-- client keeps working unchanged.
--
-- !!! OPERATOR ACTION REQUIRED BEFORE GO-LIVE !!!
-- Update the default firm's name and slug below to the real firm. After this
-- migration the existing client is reached at <slug>.cafirmops.in (not the bare
-- domain). The slug must NOT be one of the reserved subdomains: www, app, admin, api.

-- ---------------------------------------------------------------------------
-- 1. Firm (tenant) table
-- ---------------------------------------------------------------------------
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ticketSeq" INTEGER NOT NULL DEFAULT 0,
    "brandName" TEXT,
    "logoUrl" TEXT,
    "primaryColorHex" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "escalationName" TEXT,
    "escalationEmail" TEXT,
    "escalationPhone" TEXT,
    "emailFromName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Firm_slug_key" ON "Firm"("slug");
CREATE INDEX "Firm_isActive_idx" ON "Firm"("isActive");

-- ---------------------------------------------------------------------------
-- 2. Seed the default firm that owns all pre-existing data
-- ---------------------------------------------------------------------------
INSERT INTO "Firm" ("id", "name", "slug", "isActive", "ticketSeq", "createdAt", "updatedAt")
VALUES ('firm_default', 'Default Firm', 'firm1', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- 3. Add firmId columns (nullable first so existing rows can be backfilled)
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN "firmId" TEXT;
ALTER TABLE "Client" ADD COLUMN "firmId" TEXT;
ALTER TABLE "Category" ADD COLUMN "firmId" TEXT;
ALTER TABLE "WorkTemplate" ADD COLUMN "firmId" TEXT;
ALTER TABLE "TemplateSubtask" ADD COLUMN "firmId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "firmId" TEXT;
ALTER TABLE "TicketSubtask" ADD COLUMN "firmId" TEXT;
ALTER TABLE "TicketComment" ADD COLUMN "firmId" TEXT;
ALTER TABLE "TimeEntry" ADD COLUMN "firmId" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "firmId" TEXT;
ALTER TABLE "RecurringSchedule" ADD COLUMN "firmId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "firmId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN "firmId" TEXT;

-- ---------------------------------------------------------------------------
-- 4. Backfill all existing rows to the default firm
-- ---------------------------------------------------------------------------
UPDATE "User" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "Client" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "Category" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "WorkTemplate" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "TemplateSubtask" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "Ticket" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "TicketSubtask" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "TicketComment" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "TimeEntry" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "Attachment" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "RecurringSchedule" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "ActivityLog" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;
UPDATE "NotificationLog" SET "firmId" = 'firm_default' WHERE "firmId" IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Seed the per-firm ticket counter from the existing global max
-- ---------------------------------------------------------------------------
UPDATE "Firm"
SET "ticketSeq" = COALESCE((SELECT MAX("ticketNumber") FROM "Ticket"), 0)
WHERE "id" = 'firm_default';

-- ---------------------------------------------------------------------------
-- 6. Enforce NOT NULL now that every row has a firm
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "Client" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "WorkTemplate" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "TemplateSubtask" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "TicketSubtask" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "TicketComment" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "TimeEntry" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "Attachment" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "RecurringSchedule" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "ActivityLog" ALTER COLUMN "firmId" SET NOT NULL;
ALTER TABLE "NotificationLog" ALTER COLUMN "firmId" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Drop the old global-unique constraints and the global ticket sequence
-- ---------------------------------------------------------------------------
DROP INDEX "User_email_key";
DROP INDEX "Category_name_key";
DROP INDEX "Ticket_ticketNumber_key";
-- Replace the global autoincrement sequence with a plain default; per-firm
-- numbers are assigned in application code (the tenant Prisma extension).
ALTER TABLE "Ticket" ALTER COLUMN "ticketNumber" SET DEFAULT 0;
DROP SEQUENCE IF EXISTS "Ticket_ticketNumber_seq";

-- ---------------------------------------------------------------------------
-- 8. Per-firm indexes, composite uniques, and foreign keys
-- ---------------------------------------------------------------------------
CREATE INDEX "User_firmId_idx" ON "User"("firmId");
CREATE UNIQUE INDEX "User_firmId_email_key" ON "User"("firmId", "email");
CREATE INDEX "Client_firmId_idx" ON "Client"("firmId");
CREATE INDEX "Category_firmId_idx" ON "Category"("firmId");
CREATE UNIQUE INDEX "Category_firmId_name_key" ON "Category"("firmId", "name");
CREATE INDEX "WorkTemplate_firmId_idx" ON "WorkTemplate"("firmId");
CREATE INDEX "TemplateSubtask_firmId_idx" ON "TemplateSubtask"("firmId");
CREATE INDEX "Ticket_firmId_idx" ON "Ticket"("firmId");
CREATE UNIQUE INDEX "Ticket_firmId_ticketNumber_key" ON "Ticket"("firmId", "ticketNumber");
CREATE INDEX "TicketSubtask_firmId_idx" ON "TicketSubtask"("firmId");
CREATE INDEX "TicketComment_firmId_idx" ON "TicketComment"("firmId");
CREATE INDEX "TimeEntry_firmId_idx" ON "TimeEntry"("firmId");
CREATE INDEX "Attachment_firmId_idx" ON "Attachment"("firmId");
CREATE INDEX "RecurringSchedule_firmId_idx" ON "RecurringSchedule"("firmId");
CREATE INDEX "ActivityLog_firmId_idx" ON "ActivityLog"("firmId");
CREATE INDEX "NotificationLog_firmId_idx" ON "NotificationLog"("firmId");

ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkTemplate" ADD CONSTRAINT "WorkTemplate_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemplateSubtask" ADD CONSTRAINT "TemplateSubtask_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketSubtask" ADD CONSTRAINT "TicketSubtask_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
