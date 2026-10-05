import { isIsoDate, londonToday } from "@/lib/dates";
import { createJob } from "@/server/actions/jobs";
import { requireUser } from "@/server/dal";
import { BookingForm } from "@/components/booking-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Book in a job" };

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const today = londonToday();
  const defaultDate = params.date && isIsoDate(params.date) ? params.date : today;

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <h1 className="font-display text-4xl">Book in a job</h1>
      <p className="text-stone">Customer and site details for this survey / quote visit.</p>
      <div className="card">
        <BookingForm action={createJob} defaultDate={defaultDate} accent={user.branding.accentColour} accentInk={user.branding.accentInk} />
      </div>
    </div>
  );
}
