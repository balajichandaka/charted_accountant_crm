-- Per-firm outbound email (SMTP) credentials on the Firm row.
-- Additive only: adds nullable columns; existing firms/rows are untouched.
-- smtpPassEnc holds the AES-256-GCM ciphertext of the app-password (never plaintext).

-- AlterTable
ALTER TABLE "Firm" ADD COLUMN     "smtpFrom" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPassEnc" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpSecure" BOOLEAN,
ADD COLUMN     "smtpUser" TEXT;
