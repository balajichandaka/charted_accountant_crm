/**
 * CLI to create a platform (super-admin) account.
 *
 * Usage:
 *   tsx src/scripts/create-platform-admin.ts \
 *     --name "Platform Admin" --email admin@cafirmops.in --password "s3cret123"
 *
 * Then sign in to the console at /platform/login (or admin.cafirmops.in).
 */
import bcrypt from "bcryptjs";
import { basePrisma } from "../lib/prisma";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg("--name");
  const email = arg("--email")?.trim().toLowerCase();
  const password = arg("--password");

  if (!name || !email || !password) {
    console.error("Missing arguments. Required: --name, --email, --password");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await basePrisma.platformAdmin.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.error(`A platform admin with email "${email}" already exists.`);
    process.exit(1);
  }

  const admin = await basePrisma.platformAdmin.create({
    data: { name, email, passwordHash: bcrypt.hashSync(password, 10) },
    select: { id: true, name: true, email: true },
  });
  console.log("✓ Platform admin created:");
  console.log(`  ${admin.name} <${admin.email}> (id: ${admin.id})`);
  console.log("  Sign in at /platform/login");
}

main()
  .then(() => basePrisma.$disconnect())
  .catch(async (e) => {
    console.error("Failed:", e instanceof Error ? e.message : e);
    await basePrisma.$disconnect();
    process.exit(1);
  });
