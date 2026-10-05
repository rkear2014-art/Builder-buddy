import Link from "next/link";
import { placeDiaryJob } from "@/server/actions/diary";
import { STATUS_LABELS } from "@/lib/constants";
import { formatIsoDate, formatMonthTitle, formatWeekday, monthMatrix, weekDates } from "@/lib/dates";
import {
  BOOKING_KINDS,
  bookingKindLabel,
  cardsForDate,
  dayProgressLabel,
  diaryHref,
  formatDiaryRange,
  upcomingDays,
  type DiaryBooking,
  type DiaryView,
} from "@/lib/diary";
import { DiaryCardView } from "@/components/diary-card";

export function DiaryLegend() {
  return (
    <ul className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm font-bold" aria-label="Booking colours">
      {BOOKING_KINDS.map((kind) => (
        <li key={kind.id} className="flex items-center gap-1.5">
          <span className={`diary-swatch diary-swatch-${kind.id}`} aria-hidden="true" />
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
    <section className="card grid gap-3" aria-label="To book">
      <div>
        <h2 className="font-display text-2xl">To book</h2>
        <p className="text-sm font-semibold text-stone">Won jobs with no day yet. Tap one, then tap a day.</p>
      </div>
      {jobs.length === 0 ? (
        <p>Nothing waiting. On Book in, tick “Won — date still to book”.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {jobs.map((job) => {
            const selected = job.id === selectedId;
            return (
              <Link
                key={job.id}
                href={diaryHref({ view, date: anchor, book: selected ? null : job.id })}
                className={`flex min-h-16 flex-col justify-center rounded-2xl border-2 px-3 py-2 ${
                  selected ? "border-ink bg-sand" : "border-line bg-white"
                }`}
                aria-current={selected ? "true" : undefined}
              >
                <span className="font-extrabold">{job.customerName}</span>
                <span className="text-sm font-semibold">
                  {[job.postcode, bookingKindLabel(job.bookingKind), STATUS_LABELS[job.status]].filter(Boolean).join(" · ")}
                </span>
                <span className="line-clamp-2 text-sm text-stone">{job.summary}</span>
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
      <button type="submit" className="btn btn-primary w-full px-1 py-2 text-sm">
        {label}
      </button>
    </form>
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
    <div className="overflow-x-auto pb-1">
      <div className="grid w-[70rem] grid-cols-7 gap-2">
      {days.map((day) => {
        const cards = cardsForDate(bookings, day);
        const todayColumn = day === today;
        return (
          <section key={day} className={`grid content-start gap-1.5 p-1.5 ${todayColumn ? "diary-today" : ""}`}>
            <div className="text-center">
              <p className="text-xs font-extrabold uppercase">{formatWeekday(day)}</p>
              <p className="text-2xl font-extrabold leading-none">{Number(day.slice(8))}</p>
              {todayColumn ? <p className="text-xs font-extrabold">Today</p> : null}
              {showDayPrint ? (
                <Link href={`/diary/print?scope=day&date=${day}`} className="text-xs font-bold underline">
                  Print
                </Link>
              ) : null}
            </div>
            {bookJob ? <BookDayForm jobId={bookJob.id} date={day} view={view} label="Book" /> : null}
            {cards.map((card) => (
              <DiaryCardView key={`${card.id}-${day}`} card={card} compact />
            ))}
          </section>
        );
      })}
      </div>
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
            const className = `flex min-h-16 flex-col rounded-xl p-1 text-left ${day === today ? "diary-today" : inMonth ? "bg-card" : "text-stone"}`;
            const body = (
              <>
                <span className="text-sm font-extrabold">{Number(day.slice(8))}</span>
                {cards.slice(0, 2).map((card) => (
                  <span key={card.id} className="truncate text-[0.65rem] font-bold">
                    <span className={`mr-1 inline-block h-2 w-2 rounded-sm diary-swatch diary-swatch-${card.bookingKind}`} />
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
                  <button type="submit" className="text-left">
                    {body}
                  </button>
                </form>
              );
            }
            return (
              <Link key={day} href={diaryHref({ view: "week", date: day })} className={className}>
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
  const filled = days.filter((day) => day.cards.length > 0 || bookJob);
  if (filled.length === 0) return <p className="card">Nothing in this week.</p>;
  return (
    <div className="grid gap-4">
      {filled.map((day) => (
        <section key={day.date} className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl">{formatIsoDate(day.date, "long")}</h2>
            <Link href={`/diary/print?scope=day&date=${day.date}`} className="font-bold underline">
              Print
            </Link>
          </div>
          {bookJob ? <BookDayForm jobId={bookJob.id} date={day.date} view={view} label={`Book ${bookJob.customerName.split(" ")[0]}`} /> : null}
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
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-3xl">Upcoming</h2>
      {rows.length === 0 ? (
        <p className="card">Nothing booked in the next three weeks.</p>
      ) : (
        rows.map((row) => (
          <div key={row.date} className="grid gap-2">
            <h3 className="font-extrabold">{formatIsoDate(row.date, "long")}</h3>
            {row.cards.map((card) => {
              const progress = dayProgressLabel(card.dayNumber, card.spanDays);
              return (
                <Link key={`${card.id}-${row.date}`} href={`/jobs/${card.id}`} className={`diary-card diary-card-${card.bookingKind}`}>
                  <span className="text-xs font-extrabold">
                    {bookingKindLabel(card.bookingKind)}
                    {progress ? ` · ${progress}` : ""}
                  </span>
                  <span className="block font-extrabold">
                    {card.customerName}
                    {card.postcode ? ` · ${card.postcode}` : ""}
                  </span>
                  <span className="block text-sm text-stone">{card.summary}</span>
                  <span className="diary-pill">{STATUS_LABELS[card.status]}</span>
                  <span className="block text-sm font-semibold">{card.assignedName}</span>
                </Link>
              );
            })}
          </div>
        ))
      )}
    </section>
  );
}

export function diaryTitle(view: DiaryView, anchor: string): string {
  if (view === "month") return formatMonthTitle(anchor);
  const week = weekDates(anchor);
  return formatDiaryRange(week[0], week[6]);
}
