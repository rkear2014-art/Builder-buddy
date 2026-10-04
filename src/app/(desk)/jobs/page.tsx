import Link from "next/link";
import { JOB_STATUSES, STATUS_LABELS, isJobStatus } from "@/lib/constants";
import { listJobs, requireUser } from "@/server/dal";
import { JobCard } from "@/components/job-card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Jobs" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const status = params.status && isJobStatus(params.status) ? params.status : undefined;
  const query = params.q?.trim() ?? "";
  const jobs = await listJobs(user.businessId, { status, query });

  function filterHref(nextStatus?: string) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (nextStatus) search.set("status", nextStatus);
    const value = search.toString();
    return value ? `/jobs?${value}` : "/jobs";
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Jobs</h1>
        <Link href="/jobs/new" className="btn btn-primary">
          Book in
        </Link>
      </div>
      <form action="/jobs" className="grid gap-3">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label className="field">
          Search
          <input name="q" defaultValue={query} placeholder="Name, address, or the work" />
        </label>
        <button className="btn btn-secondary w-full sm:w-auto" type="submit">
          Search
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Link href={filterHref()} className={`btn ${status ? "btn-secondary" : "btn-primary"}`}>
          All
        </Link>
        {JOB_STATUSES.map((item) => (
          <Link
            key={item}
            href={filterHref(item)}
            className={`btn ${status === item ? "btn-primary" : "btn-secondary"}`}
          >
            {STATUS_LABELS[item]}
          </Link>
        ))}
      </div>
      {jobs.length === 0 ? (
        <p className="card text-stone">No jobs match. Book one in, or clear the search.</p>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
