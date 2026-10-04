import bcrypt from "bcryptjs";
import { databaseFailureMessage } from "@/lib/database";
import {
  evaluateSetupClaim,
  requiredSetupToken,
  settleSetupCheck,
  type SetupCheck,
  type SetupSnapshot,
} from "@/lib/setup-gate";
import type { AccountInput } from "@/lib/validators";
import { getPrisma, isUniqueConstraint } from "@/server/prisma";

export async function readSetupSnapshot(): Promise<SetupSnapshot> {
  const prisma = getPrisma();
  const [userCount, lock] = await Promise.all([
    prisma.user.count(),
    prisma.setupLock.findUnique({ where: { id: 1 }, select: { claimed: true } }),
  ]);
  return { userCount, claimed: lock ? lock.claimed : null };
}

export async function checkFirstAccount(): Promise<SetupCheck> {
  return settleSetupCheck(readSetupSnapshot);
}

/**
 * Creates the owner and their business only while the singleton lock is free
 * and the user table is empty. The row lock makes a second request wait, then
 * see the claim and stop.
 */
export async function claimFirstAccount(
  input: AccountInput,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const requiredToken = requiredSetupToken(process.env.SETUP_TOKEN);
  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    return await getPrisma().$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ claimed: boolean }>>`
        SELECT "claimed" FROM "SetupLock" WHERE "id" = 1 FOR UPDATE
      `;
      const userCount = await tx.user.count();
      const decision = evaluateSetupClaim(
        { userCount, claimed: rows[0] ? rows[0].claimed : null },
        { suppliedToken: input.setupToken, requiredToken },
      );
      if (!decision.ok) {
        return {
          ok: false as const,
          error:
            decision.reason === "token"
              ? "That setup code is not right."
              : "An account already exists. Sign in instead.",
        };
      }
      const business = await tx.business.create({ data: { name: input.businessName } });
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: "OWNER",
          businessId: business.id,
        },
      });
      const claimed = await tx.setupLock.updateMany({
        where: { id: 1, claimed: false },
        data: { claimed: true, claimedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new Error("Setup lock was not claimed.");
      }
      return { ok: true as const, userId: user.id };
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return { ok: false, error: "An account already exists. Sign in instead." };
    }
    return { ok: false, error: databaseFailureMessage(error) };
  }
}
