import Link from "next/link";
import { placeDiaryJob } from "@/server/actions/diary";
import { formatIsoDate, formatMonthTitle, formatWeekday, monthMatrix, weekDates } from "@/lib/dates";
import {
  BOOKING_KINDS,
  cardsForDate,
  diaryHref,
  formatDiaryDay,
  formatDiaryRange,
  upcomingDays,
  type DiaryBooking,
  type DiaryView,
} from "@/lib/diary";
import { DiaryCardView } from "@/components/diary-card";
import { PillLink } from "@/components/pill-link";
import { EmptyState } from "@/components/empty-state";

export function DiaryLegend() {
  return (
    <ul className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm font-semibold" aria-label="Booking colours">
      {BOOKING_KINDS.map((kind) => (
        <li key={kind.id} className="flex items-center gap-1.5">
          <span className={`diary-dot diary-dot-${kind.id}`} aria-hidden="true" />
          {kind.label}
        </li>
      ))}
    </ul>
  );
}

export function DiaryToBook({
  jobs,
  selectedId,
  view,
  anchor,
}: {
  jobs: DiaryBooking[];
  selectedId: string | null;
  view: DiaryView;
  anchor: string;
}) {
  return (
    <section className="diary-panel" aria-label="To book">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">To book</h2>
          <p className="text-sm text-stone">
            {selectedId
              ? "Tap Book on a day to put this job on the diary."
              : "Enquiry, booked and in-progress jobs with no day yet. Tap one, then tap Book on a day."}
          </p>
        </div>
        <span className="diary-count">{jobs.length}</span>
      </div>
      {jobs.length === 0 ? (
        <div className="mt-3">
          <EmptyState compact>Nothing waiting. Tap an empty day, or open a job and tap Book in on diary.</EmptyState>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {jobs.map((job) => {
            const selected = job.id === selectedId;
            return (
              <Link
                key={job.id}
                href={diaryHref({ view, date: anchor, book: selected ? null : job.id })}
                className={`diary-wait ${selected ? "diary-wait-on" : ""}`}
                aria-current={selected ? "true" : undefined}
              >
                <span className="block font-extrabold">{job.customerName}</span>
                <span className="block text-sm text-stone">
                  {[job.summary, job.postcode].filter(Boolean).join(" · ")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BookDayForm({
  jobId,
  date,
  view,
  label,
}: {
  jobId: string;
  date: string;
  view: DiaryView;
  label: string;
}) {
  return (
    <form action={placeDiaryJob}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="view" value={view} />
      <button type="submit" className="diary-book no-print">
        {label}
      </button>
    </form>
  );
}

function EmptyDayLink({ day, view }: { day: string; view: DiaryView }) {
  return (
    <Link href={diaryHref({ view, date: day, pick: day })} className="diary-book no-print">
      Book a job
    </Link>
  );
}

export function DiaryDayOffer({
  date,
  jobs,
  view,
}: {
  date: string;
  jobs: DiaryBooking[];
  view: DiaryView;
}) {
  return (
    <section className="card grid gap-3" aria-label={`Book a job on ${formatIsoDate(date, "long")}`}>
      <h2 className="font-display text-3xl leading-tight">Book a job on {formatIsoDate(date, "long")}</h2>
      <p className="font-semibold">Tap a name to put that job on this day.</p>
      {jobs.length === 0 ? (
        <EmptyState compact>No open jobs yet.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {jobs.map((job) => {
            const here = job.onDiary && job.startDate === date;
            return (
              <form key={job.id} action={placeDiaryJob}>
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="view" value={view} />
                <button type="submit" className="btn btn-secondary min-h-16 w-full justify-between text-left">
                  <span className="font-extrabold">{job.customerName}</span>
                  <span>{here ? "On this day" : job.onDiary ? "Move here" : "Book here"}</span>
                </button>
              </form>
            );
          })}
        </div>
      )}
      <Link href={`/jobs/new?date=${date}`} className="btn btn-primary min-h-16 w-full text-lg">
        Book in a new job on this day
      </Link>
    </section>
  );
}

export function DiaryWeek({
  anchor,
  today,
  bookings,
  bookJob,
  view,
  showDayPrint = true,
}: {
  anchor: string;
  today: string;
  bookings: DiaryBooking[];
  bookJob: DiaryBooking | null;
  view: DiaryView;
  showDayPrint?: boolean;
}) {
  const days = weekDates(anchor);
  return (
    <div className="diary-week">
      {days.map((day) => {
        const cards = cardsForDate(bookings, day);
        const todayColumn = day === today;
        const firstName = bookJob?.customerName.split(" ")[0];
        return (
          <section key={day} className={`diary-col ${todayColumn ? "diary-col-today" : ""}`}>
            <div className="diary-col-head">
              <p className="diary-dow">{formatWeekday(day)}</p>
              <div className="flex flex-wrap items-center gap-1">
                {todayColumn ? <span className="diary-today-pill">{formatDiaryDay(day)}</span> : <span className="text-sm font-extrabold">{formatDiaryDay(day)}</span>}
                {todayColumn ? <span className="diary-today-tag">Today</span> : null}
              </div>
              {showDayPrint ? (
                <Link href={`/diary/print?scope=day&date=${day}`} className="diary-print-link">
                  Print
                </Link>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              {cards.map((card) => (
                <DiaryCardView key={`${card.id}-${day}`} card={card} compact />
              ))}
            </div>
            {showDayPrint ? (
              bookJob ? (
                <BookDayForm jobId={bookJob.id} date={day} view={view} label={firstName ? `Book ${firstName}` : "Book"} />
              ) : (
                <EmptyDayLink day={day} view={view} />
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function DiaryMonth({
  anchor,
  today,
  bookings,
  bookJob,
  view,
}: {
  anchor: string;
  today: string;
  bookings: DiaryBooking[];
  bookJob: DiaryBooking | null;
  view: DiaryView;
}) {
  const weeks = monthMatrix(anchor);
  const monthPrefix = anchor.slice(0, 7);
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold uppercase text-stone">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7 gap-1">
          {week.map((day) => {
            const cards = cardsForDate(bookings, day);
            const inMonth = day.startsWith(monthPrefix);
            const className = `flex min-h-16 flex-col rounded-xl p-1 text-left ${day === today ? "diary-col-today" : inMonth ? "bg-card" : "text-stone"}`;
            const body = (
              <>
                <span className="text-sm font-extrabold">{Number(day.slice(8))}</span>
                {cards.slice(0, 2).map((card) => (
                  <span key={card.id} className="truncate text-[0.65rem] font-bold">
                    <span className={`diary-dot diary-dot-${card.bookingKind} mr-1`} />
                    {card.customerName.split(" ")[0]}
                  </span>
                ))}
                {cards.length > 2 ? <span className="text-[0.65rem] font-bold">+{cards.length - 2}</span> : null}
              </>
            );
            if (bookJob) {
              return (
                <form key={day} action={placeDiaryJob} className={className}>
                  <input type="hidden" name="jobId" value={bookJob.id} />
                  <input type="hidden" name="date" value={day} />
                  <input type="hidden" name="view" value={view} />
                  <button type="submit" className="min-h-16 text-left">
                    {body}
                    <span className="mt-1 block text-xs font-extrabold">Book</span>
                  </button>
                </form>
              );
            }
            return (
              <Link key={day} href={diaryHref({ view: "week", date: day, pick: cards.length === 0 ? day : null })} className={className}>
                {body}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function DiaryList({
  anchor,
  bookings,
  bookJob,
  view,
}: {
  anchor: string;
  bookings: DiaryBooking[];
  bookJob: DiaryBooking | null;
  view: DiaryView;
}) {
  const days = weekDates(anchor).map((date) => ({ date, cards: cardsForDate(bookings, date) }));
  return (
    <div className="grid gap-4">
      {days.map((day) => (
        <section key={day.date} className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl">{formatIsoDate(day.date, "long")}</h2>
            <PillLink href={`/diary/print?scope=day&date=${day.date}`}>Print</PillLink>
          </div>
          {bookJob ? (
            <BookDayForm jobId={bookJob.id} date={day.date} view={view} label={`Book ${bookJob.customerName.split(" ")[0]}`} />
          ) : (
            <EmptyDayLink day={day.date} view={view} />
          )}
          {day.cards.length === 0 ? <p className="text-sm font-semibold text-stone">Nothing else this day.</p> : null}
          {day.cards.map((card) => (
            <DiaryCardView key={`${card.id}-${day.date}`} card={card} />
          ))}
        </section>
      ))}
    </div>
  );
}

export function DiaryUpcoming({ bookings, today }: { bookings: DiaryBooking[]; today: string }) {
  const rows = upcomingDays(bookings, today).slice(0, 8);
  const cards = rows.flatMap((row) => row.cards);
  return (
    <section className="diary-panel">
      <h2 className="text-xl font-extrabold">Upcoming</h2>
      {cards.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-stone">Nothing booked in the next three weeks.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {cards.map((card) => (
            <DiaryCardView key={`${card.id}-${card.date}`} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}

export function diaryTitle(view: DiaryView, anchor: string): string {
  if (view === "month") return formatMonthTitle(anchor);
  const week = weekDates(anchor);
  return formatDiaryRange(week[0], week[6]);
}
