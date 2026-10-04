import { isIsoDate, londonToday } from "@/lib/dates";
import { createJob } from "@/server/actions/jobs";
import { requireUser } from "@/server/dal";
import { JobForm } from "@/components/job-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Book in a job" };

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const today = londonToday();
  const defaultDate = params.date && isIsoDate(params.date) ? params.date : today;

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <h1 className="font-display text-4xl">Book in a job</h1>
      <p className="text-stone">Customer, trade, the work, and when you are going.</p>
      <div className="card">
        <JobForm action={createJob} submitLabel="Save job" defaultDate={defaultDate} />
      </div>
    </div>
  );
}
