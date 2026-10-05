import Link from "next/link";
import { notFound } from "next/navigation";
import { formatIsoDate } from "@/lib/dates";
import { bookingKindLabel } from "@/lib/diary";
import { saveDiaryBooking } from "@/server/actions/diary";
import { getJob, requireUser } from "@/server/dal";
import { DiaryBookForm } from "@/components/diary-book-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  return { title: job ? `Book in ${job.customerName}` : "Book in on diary" };
}

export default async function BookJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  if (!job) notFound();

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <p>
        <Link href={`/jobs/${job.id}`} className="font-bold underline" style={{ color: user.branding.accentColour }}>
          {job.customerName}
        </Link>
      </p>
      <h1 className="font-display text-5xl leading-none tracking-tight">Book in on diary</h1>
      <p className="text-lg font-semibold">
        {job.onDiary
          ? `On the diary from ${formatIsoDate(job.scheduledDate, "long")} as ${bookingKindLabel(job.bookingKind)}.`
          : "Not on the diary yet. Choose the day, then Job or Quote visit."}
      </p>
      <div className="card">
        <DiaryBookForm
          action={saveDiaryBooking}
          jobId={job.id}
          defaultDate={job.scheduledDate}
          bookingKind={job.bookingKind}
          spanDays={job.spanDays}
        />
      </div>
    </div>
  );
}
