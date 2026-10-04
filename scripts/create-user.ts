import "dotenv/config";
import bcrypt from "bcryptjs";
import { passwordProblem } from "../src/lib/password";
import { getPrisma } from "../src/server/prisma";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const businessName = arg("business")?.trim();
  const password = arg("password") ?? "";
  if (!email || !name || !businessName || !password) {
    console.error(
      'Usage: npm run user:create -- --email you@example.com --name "Sam Hart" --business "Hart & Co" --password "a-long-password-1"',
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    console.error("Set DATABASE_URL and AUTH_SECRET before creating a user.");
    process.exit(1);
  }
  const passwordError = passwordProblem(password, email);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }
  if (name.length < 2 || businessName.length < 2) {
    console.error("Enter a name and a business name.");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.business.update({ where: { id: existing.businessId }, data: { name: businessName } });
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash },
    });
    console.log(`Updated ${email}. Their jobs stay on the same business.`);
  } else {
    await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { name: businessName } });
      await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "OWNER",
          businessId: business.id,
        },
      });
      await tx.setupLock.upsert({
        where: { id: 1 },
        update: { claimed: true, claimedAt: new Date() },
        create: { id: 1, claimed: true, claimedAt: new Date() },
      });
    });
    console.log(`Created ${email} as the owner of ${businessName}.`);
    console.log("That business cannot see any other business. First-account setup is now closed.");
  }
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await getPrisma().$disconnect().catch(() => undefined);
  process.exit(1);
});
