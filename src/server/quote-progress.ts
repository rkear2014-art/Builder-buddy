import "server-only";
import { getPrisma } from "@/server/prisma";

/** A draft becomes quoted once the quote is built. Won, sent and lost stay put. */
export async function noteQuoteMade(jobId: string): Promise<void> {
  await getPrisma().job.updateMany({
    where: { id: jobId, quoteStage: "DRAFT" },
    data: { quoteStage: "QUOTED" },
  });
}
