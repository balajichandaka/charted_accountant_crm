import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireCA } from "../middleware/auth";
import { encryptSecret } from "../lib/crypto";
import { sendEmail } from "../lib/email";
import { buildSmtpConfig } from "../lib/notifications";

const router = Router();
router.use(authMiddleware);

const FIRM_SELECT = {
  id: true,
  name: true,
  slug: true,
  brandName: true,
  logoUrl: true,
  primaryColorHex: true,
  contactEmail: true,
  contactPhone: true,
  escalationName: true,
  escalationEmail: true,
  escalationPhone: true,
  emailFromName: true,
  // SMTP: safe-to-read fields only. smtpPassEnc is NEVER returned; the client
  // learns whether a password is set via the computed `smtpConfigured` flag.
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUser: true,
  smtpFrom: true,
} as const;

// GET /api/firm — the current firm's profile/branding (any authenticated user).
router.get("/", async (_req, res, next) => {
  try {
    const firm = await prisma.firm.findFirst({
      select: { ...FIRM_SELECT, smtpPassEnc: true },
    });
    if (!firm) { res.status(404).json({ ok: false, error: "Firm not found" }); return; }
    const { smtpPassEnc, ...safe } = firm;
    res.json({ ok: true, data: { ...safe, smtpConfigured: smtpPassEnc != null } });
  } catch (err) { next(err); }
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  brandName: z.string().optional(),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  primaryColorHex: z.string().optional(),
  contactEmail: z.string().email().or(z.literal("")).optional(),
  contactPhone: z.string().optional(),
  escalationName: z.string().optional(),
  escalationEmail: z.string().email().or(z.literal("")).optional(),
  escalationPhone: z.string().optional(),
  emailFromName: z.string().optional(),
  // SMTP settings. smtpPass is write-only (plaintext in, encrypted at rest);
  // omit it to keep the existing password, or set smtpClear:true to remove creds.
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpFrom: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpClear: z.boolean().optional(),
});

// PATCH /api/firm — update the current firm's branding/contact + SMTP (CA only).
// slug is intentionally NOT editable here (it is the tenant's public address).
router.patch("/", requireCA, async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message });
      return;
    }
    const current = await prisma.firm.findFirst({ select: { id: true } });
    if (!current) { res.status(404).json({ ok: false, error: "Firm not found" }); return; }

    // Split write-only credential controls out of the plain column data.
    const { smtpPass, smtpClear, ...data } = parsed.data;
    const updateData: Record<string, unknown> = { ...data };
    if (smtpClear) {
      updateData.smtpPassEnc = null;
      updateData.smtpHost = null;
      updateData.smtpUser = null;
      updateData.smtpFrom = null;
      updateData.smtpPort = null;
      updateData.smtpSecure = null;
    } else if (typeof smtpPass === "string" && smtpPass.length > 0) {
      updateData.smtpPassEnc = encryptSecret(smtpPass);
    }

    const firm = await prisma.firm.update({
      where: { id: current.id },
      data: updateData,
      select: { ...FIRM_SELECT, smtpPassEnc: true },
    });
    const { smtpPassEnc, ...safe } = firm;
    res.json({ ok: true, data: { ...safe, smtpConfigured: smtpPassEnc != null } });
  } catch (err) { next(err); }
});

// POST /api/firm/test-email — send a test message using the firm's saved SMTP
// config to the requesting CA's own email (CA only).
router.post("/test-email", requireCA, async (req, res, next) => {
  try {
    const firm = await prisma.firm.findFirst({
      select: {
        brandName: true,
        emailFromName: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUser: true,
        smtpPassEnc: true,
        smtpFrom: true,
      },
    });
    if (!firm) { res.status(404).json({ ok: false, error: "Firm not found" }); return; }

    const senderName = firm.emailFromName || firm.brandName || "CA Practice";
    const smtp = buildSmtpConfig(firm, senderName);
    if (!smtp) {
      res.status(400).json({
        ok: false,
        error: "No SMTP credentials saved yet. Save host, user and app password first.",
      });
      return;
    }

    const to = req.user!.email;
    try {
      await sendEmail(
        {
          to,
          subject: `${senderName} — test email`,
          html: `<p>This is a test email confirming your firm's outbound email settings are working.</p>`,
        },
        smtp
      );
      res.json({ ok: true, data: { to } });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to send test email.",
      });
    }
  } catch (err) { next(err); }
});

export default router;
