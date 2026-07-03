import bcrypt from "bcryptjs";
import { basePrisma } from "./prisma";

// Subdomains reserved for shared surfaces — never a firm slug.
export const RESERVED_SLUGS = new Set(["www", "app", "admin", "api"]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export type ProvisionFirmInput = {
  firmName: string;
  slug: string;
  caName: string;
  caEmail: string;
  caPassword: string;
  brandName?: string;
};

export type ProvisionResult = {
  firm: { id: string; name: string; slug: string };
  ca: { id: string; name: string; email: string };
};

/**
 * Create a new firm (tenant) and its first CA user atomically. Used by the
 * platform-admin endpoint and the create-firm CLI. Validates the slug and
 * rejects duplicates. Throws Error with a user-safe message on validation
 * failure.
 */
export async function provisionFirm(input: ProvisionFirmInput): Promise<ProvisionResult> {
  const firmName = input.firmName?.trim();
  const slug = input.slug?.trim().toLowerCase();
  const caName = input.caName?.trim();
  const caEmail = input.caEmail?.trim().toLowerCase();
  const caPassword = input.caPassword ?? "";

  if (!firmName) throw new Error("Firm name is required.");
  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error("Slug must be 2-40 chars: lowercase letters, digits, hyphens.");
  }
  if (RESERVED_SLUGS.has(slug)) throw new Error(`Slug "${slug}" is reserved.`);
  if (!caName) throw new Error("CA name is required.");
  if (!caEmail) throw new Error("CA email is required.");
  if (caPassword.length < 8) throw new Error("CA password must be at least 8 characters.");

  const existing = await basePrisma.firm.findUnique({ where: { slug }, select: { id: true } });
  if (existing) throw new Error(`A firm with slug "${slug}" already exists.`);

  const passwordHash = bcrypt.hashSync(caPassword, 10);

  return basePrisma.$transaction(async (tx) => {
    const firm = await tx.firm.create({
      data: { name: firmName, slug, brandName: input.brandName?.trim() || firmName },
      select: { id: true, name: true, slug: true },
    });
    const ca = await tx.user.create({
      data: { firmId: firm.id, name: caName, email: caEmail, passwordHash, role: "CA" },
      select: { id: true, name: true, email: true },
    });
    return { firm, ca };
  });
}
