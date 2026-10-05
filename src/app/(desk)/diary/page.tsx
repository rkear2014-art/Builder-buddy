import Link from "next/link";
import { isIsoDate, londonToday } from "@/lib/dates";
import { diaryFetchWindow, diaryHref, diaryView, shiftDiaryAnchor, toBookJobs } from "@/lib/diary";
import { listDiaryBoard, requireUser } from "@/server/dal";
import {
  DiaryLegend,
  DiaryList,
  DiaryMonth,
  DiaryToBook,
  DiaryUpcoming,
  DiaryWeek,
  diaryTitle,
} from "@/components/diary-board";

export const dynamic = "force-dynamic";

export const metadata = { title: "Diary" };

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; book?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const today = londonToday();
  const anchor = params.date && isIsoDate(params.date) ? params.date : today;
  const view = diaryView(params.view);
  const window = diaryFetchWindow(anchor, today);
  const bookings = await listDiaryBoard(user.businessId, window.from, window.to);
  const waiting = toBookJobs(bookings);
  const selected = waiting.find((job) => job.id === params.book) ?? null;
  const title = diaryTitle(view, anchor);
  const bookId = selected?.id ?? null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <h1 className="font-display text-4xl">Diary</h1>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Diary view">
            {(["month", "week", "list"] as const).map((item) => (
              <Link
                key={item}
                href={diaryHref({ view: item, date: anchor, book: bookId })}
                className={item === view ? "btn btn-primary" : "btn btn-secondary"}
                aria-current={item === view ? "page" : undefined}
              >
                {item === "month" ? "Month" : item === "week" ? "Week" : "List"}
              </Link>
            ))}
          </div>
        </div>
        <DiaryLegend />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={diaryHref({ view, date: today, book: bookId })} className="btn btn-secondary">
          Today
        </Link>
        <Link href={diaryHref({ view, date: shiftDiaryAnchor(view, anchor, -1), book: bookId })} className="btn btn-secondary" aria-label="Previous">
          ‹
        </Link>
        <p className="min-w-40 flex-1 text-center text-xl font-extrabold">{title}</p>
        <Link href={diaryHref({ view, date: shiftDiaryAnchor(view, anchor, 1), book: bookId })} className="btn btn-secondary" aria-label="Next">
          ›
        </Link>
        <Link href={`/diary/print?scope=week&date=${anchor}`} className="btn btn-secondary">
          Print week
        </Link>
        <Link href={`/jobs/new?date=${anchor}`} className="btn btn-secondary">
          Book in
        </Link>
      </div>

      {selected ? (
        <p className="rounded-2xl border-2 border-ink bg-sand px-4 py-3 text-lg font-extrabold">
          Tap a day to book {selected.customerName}.
        </p>
      ) : null}

      <DiaryToBook jobs={waiting} selectedId={selected?.id ?? null} view={view} anchor={anchor} />

      {view === "month" ? (
        <DiaryMonth anchor={anchor} today={today} bookings={bookings} bookJob={selected} view={view} />
      ) : null}
      {view === "week" ? (
        <DiaryWeek anchor={anchor} today={today} bookings={bookings} bookJob={selected} view={view} />
      ) : null}
      {view === "list" ? <DiaryList anchor={anchor} bookings={bookings} bookJob={selected} view={view} /> : null}

      <DiaryUpcoming bookings={bookings} today={today} />
    </div>
  );
}
