import "server-only";
import { revalidatePath } from "next/cache";

export function revalidateDesk(jobId?: string, shareToken?: string): void {
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/diary");
  revalidatePath("/library");
  revalidatePath("/quotes");
  revalidatePath("/invoices");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  if (shareToken) {
    revalidatePath(`/sign/${shareToken}`);
    revalidatePath(`/sign/${shareToken}/print`);
  }
}
