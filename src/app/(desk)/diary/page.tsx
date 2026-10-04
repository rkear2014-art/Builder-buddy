import Link from "next/link";
import { formatIsoDate, formatMonthTitle, formatWeekday, isIsoDate, londonToday, monthMatrix, weekDates, addDays } from "@/lib/dates";
import { getDiaryJobs, requireUser } from "@/server/dal";
import { JobCard } from "@/components/job-card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Diary" };

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const today = londonToday();
  const selected = params.date && isIsoDate(params.date) ? params.date : today;
  const weeks = monthMatrix(selected);
  const week = weekDates(selected);
  const jobs = await getDiaryJobs(user.id, weeks[0][0], weeks[weeks.length - 1][6]);
  const counts = new Map<string, number>();
  for (const job of jobs) {
    counts.set(job.scheduledDate, (counts.get(job.scheduledDate) ?? 0) + 1);
  }
  const dayJobs = jobs.filter((job) => job.scheduledDate === selected);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Diary</h1>
        <Link href={`/jobs/new?date=${selected}`} className="btn btn-primary">
          Book this day
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link href={`/diary?date=${addDays(selected, -7)}`} className="btn btn-secondary">
          Previous
        </Link>
        <p className="text-center font-bold">
          {formatIsoDate(week[0])} – {formatIsoDate(week[6])}
        </p>
        <Link href={`/diary?date=${addDays(selected, 7)}`} className="btn btn-secondary">
          Next
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {week.map((day) => {
          const active = day === selected;
          const count = counts.get(day) ?? 0;
          return (
            <Link
              key={day}
              href={`/diary?date=${day}`}
              aria-current={active ? "date" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-1 text-center ${
                active ? "border-ink bg-amber" : "border-line bg-card"
              }`}
            >
              <span className="text-xs font-bold uppercase">{formatWeekday(day)}</span>
              <span className="text-lg font-bold">{Number(day.slice(8))}</span>
              <span className="text-xs font-bold">{count > 0 ? count : ""}</span>
            </Link>
          );
        })}
      </div>

      <section className="grid gap-3">
        <h2 className="font-display text-3xl">{formatIsoDate(selected, "long")}</h2>
        {dayJobs.length === 0 ? (
          <p className="card text-stone">Nothing booked. Use “Book this day” to add a job.</p>
        ) : (
          dayJobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </section>

      <section className="card">
        <h2 className="font-display text-2xl">{formatMonthTitle(selected)}</h2>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm font-bold text-stone">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-1 grid gap-1">
          {weeks.map((row) => (
            <div key={row[0]} className="grid grid-cols-7 gap-1">
              {row.map((day) => {
                const inMonth = day.slice(0, 7) === selected.slice(0, 7);
                const count = counts.get(day) ?? 0;
                return (
                  <Link
                    key={day}
                    href={`/diary?date=${day}`}
                    className={`flex min-h-11 flex-col items-center justify-center rounded-xl ${
                      day === selected ? "bg-amber font-bold" : inMonth ? "bg-sand" : "text-stone"
                    }`}
                  >
                    {Number(day.slice(8))}
                    {count > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-pine" /> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
