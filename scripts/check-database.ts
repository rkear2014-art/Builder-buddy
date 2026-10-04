import "dotenv/config";
import { databaseFailureMessage } from "../src/lib/database";
import { getPrisma } from "../src/server/prisma";

/**
 * Runs after `prisma migrate deploy` in the production build.
 * The CLI can report success against a database the app driver cannot query.
 * This uses the same client as the sign-in page and stops the build if SetupLock is missing.
 */
async function main(): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.$queryRaw`SELECT "id", "claimed" FROM "SetupLock" WHERE "id" = 1`;
    await prisma.user.count();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(databaseFailureMessage(error));
  process.exit(1);
});
