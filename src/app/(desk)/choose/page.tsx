import Link from "next/link";
import { slotLabel } from "@/lib/constants";
import { formatIsoDate, londonToday, weekDates } from "@/lib/dates";
import { getDiaryJobs, requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";

export const metadata = { title: "Choose a job" };

export default async function ChooseJobPage() {
  const user = await requireUser();
  const today = londonToday();
  const week = weekDates(today);
  const jobs = await getDiaryJobs(user.businessId, week[0], week[6]);
  const accent = user.branding.accentColour;

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="font-display text-4xl">Choose a job</h1>
      <p className="text-stone">Tap a job booked this week to open the photo tiles and add the work.</p>
      {jobs.length === 0 ? <p className="card">Nothing is booked this week yet. Book one in, then the tiles open.</p> : null}
      <ul className="grid gap-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}/choose`}
              className="card grid gap-1"
              style={{ borderColor: accent, borderWidth: 2 }}
            >
              <span className="font-display text-3xl leading-tight" style={{ color: accent }}>
                {job.customerName}
              </span>
              <span>
                {formatIsoDate(job.scheduledDate, "long")} · {slotLabel(job.timeSlot)}
              </span>
              <span className="text-stone">{job.address}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/jobs/new" className="btn min-h-14 text-base" style={{ background: accent, color: user.branding.accentInk }}>
        Book a new job
      </Link>
    </div>
  );
}
