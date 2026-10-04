import Link from "next/link";
import { JOB_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { formatIsoDate, greetingForHour, londonHour } from "@/lib/dates";
import { getHome, requireUser } from "@/server/dal";
import { JobCard } from "@/components/job-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const home = await getHome(user.id);
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-bold text-stone">{formatIsoDate(home.today, "long")}</p>
          <h1 className="font-display text-4xl leading-tight">
            {greetingForHour(londonHour())}, {firstName}
          </h1>
        </div>
        <Link href="/jobs/new" className="btn btn-primary">
          Book in a job
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {JOB_STATUSES.map((status) => (
          <Link key={status} href={`/jobs?status=${status}`} className="card block text-center">
            <p className="font-display text-3xl">{home.counts[status]}</p>
            <p className="font-bold">{STATUS_LABELS[status]}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-3xl">Today</h2>
        {home.todayJobs.length === 0 ? (
          <p className="card text-stone">Nothing in the diary for today.</p>
        ) : (
          home.todayJobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl">Coming up</h2>
          <Link href="/diary" className="font-bold text-sky underline">
            Open diary
          </Link>
        </div>
        {home.upcoming.length === 0 ? (
          <p className="card text-stone">No jobs in the next seven days.</p>
        ) : (
          home.upcoming.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </section>

      {home.awaitingSignature.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-display text-3xl">Waiting for a signature</h2>
          {home.awaitingSignature.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
