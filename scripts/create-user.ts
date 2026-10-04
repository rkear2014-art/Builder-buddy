import "dotenv/config";
import bcrypt from "bcryptjs";
import { getPrisma } from "../src/server/prisma";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const business = arg("business")?.trim();
  const password = arg("password");
  if (!email || !name || !business || !password) {
    console.error(
      'Usage: npm run user:create -- --email you@example.com --name "Sam Hart" --business "Hart & Co" --password "a-long-password"',
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    console.error("Set DATABASE_URL and AUTH_SECRET before creating a user.");
    process.exit(1);
  }
  if (password.length < 8 || password.length > 200) {
    console.error("Use a password of at least 8 characters.");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await getPrisma().user.upsert({
    where: { email },
    update: { name, businessName: business, passwordHash },
    create: { email, name, businessName: business, passwordHash },
  });
  console.log(`Saved ${user.email}. Existing jobs were left as they are.`);
  await getPrisma().$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await getPrisma().$disconnect().catch(() => undefined);
  process.exit(1);
});
