import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Create the initial CA admin when the database is empty. Idempotent — safe on every boot. */
async function main() {
  const existing = await prisma.user.findFirst({ where: { role: Role.CA } });
  if (existing) {
    console.log("✓ Admin user already exists. Skipping bootstrap.");
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!email || !password) {
    console.warn(
      "⚠ No CA user in database. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the admin account."
    );
    return;
  }

  // Multi-tenant: every user belongs to a firm. The initial migration creates a
  // default firm (id "firm_default", slug "firm1"); attach the bootstrap admin to
  // the existing firm, or create one if none exists yet.
  let firm = await prisma.firm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!firm) {
    firm = await prisma.firm.create({
      data: {
        name: process.env.SEED_FIRM_NAME?.trim() || "Default Firm",
        slug: process.env.SEED_FIRM_SLUG?.trim() || "firm1",
      },
    });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await prisma.user.create({
    data: {
      firmId: firm.id,
      name,
      email,
      passwordHash,
      role: Role.CA,
    },
  });

  console.log(`✓ Admin user created: ${email} (${name}) in firm "${firm.name}" (${firm.slug}).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
