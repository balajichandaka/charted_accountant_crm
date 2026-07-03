/**
 * CLI to provision a new firm (tenant) + its first CA user.
 *
 * Usage:
 *   tsx src/scripts/create-firm.ts \
 *     --name "Acme & Co" --slug acme \
 *     --ca-name "Anita CA" --ca-email anita@acme.test --ca-password "s3cret123"
 *
 * After this, the firm signs in at https://<slug>.cafirmops.in/login.
 */
import { basePrisma } from "../lib/prisma";
import { provisionFirm } from "../lib/provision";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const firmName = arg("--name");
  const slug = arg("--slug");
  const caName = arg("--ca-name");
  const caEmail = arg("--ca-email");
  const caPassword = arg("--ca-password");

  if (!firmName || !slug || !caName || !caEmail || !caPassword) {
    console.error(
      "Missing arguments. Required: --name, --slug, --ca-name, --ca-email, --ca-password"
    );
    process.exit(1);
  }

  const result = await provisionFirm({ firmName, slug, caName, caEmail, caPassword });
  console.log("✓ Firm provisioned:");
  console.log(`  Firm:  ${result.firm.name} (slug: ${result.firm.slug}, id: ${result.firm.id})`);
  console.log(`  CA:    ${result.ca.name} <${result.ca.email}>`);
  console.log(`  Login: https://${result.firm.slug}.cafirmops.in/login`);
}

main()
  .then(() => basePrisma.$disconnect())
  .catch(async (e) => {
    console.error("Provisioning failed:", e instanceof Error ? e.message : e);
    await basePrisma.$disconnect();
    process.exit(1);
  });
