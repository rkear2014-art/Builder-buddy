import Link from "next/link";
import type { CSSProperties } from "react";
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
  const accent = user.branding.accentColour;
  const accentInk = user.branding.accentInk;

  return (
    <div
      className="grid gap-4"
      style={{ "--diary-accent": accent, "--diary-ink": accentInk } as CSSProperties}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl leading-none">Diary</h1>
          <p className="mt-1 text-sm font-semibold text-stone">Quote visits and jobs on site</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="diary-toggle" role="group" aria-label="Diary view">
            {(["month", "week", "list"] as const).map((item) => (
              <Link
                key={item}
                href={diaryHref({ view: item, date: anchor, book: bookId })}
                className={item === view ? "diary-chip diary-chip-on" : "diary-chip"}
                style={item === view ? { background: accent, color: accentInk, borderColor: accent } : undefined}
                aria-current={item === view ? "page" : undefined}
              >
                {item === "month" ? "Month" : item === "week" ? "Week" : "List"}
              </Link>
            ))}
          </div>
          <Link href={`/diary/print?scope=week&date=${anchor}`} className="diary-chip">
            Print week
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={diaryHref({ view, date: shiftDiaryAnchor(view, anchor, -1), book: bookId })} className="diary-arrow" aria-label="Previous">
            ‹
          </Link>
          <Link href={diaryHref({ view, date: today, book: bookId })} className="diary-chip">
            Today
          </Link>
          <Link href={diaryHref({ view, date: shiftDiaryAnchor(view, anchor, 1), book: bookId })} className="diary-arrow" aria-label="Next">
            ›
          </Link>
          <p className="text-lg font-extrabold">{title}</p>
        </div>
        <DiaryLegend />
      </div>

      {selected ? <p className="text-lg font-extrabold">Tap a day to book {selected.customerName}.</p> : null}

      {view === "month" ? (
        <DiaryMonth anchor={anchor} today={today} bookings={bookings} bookJob={selected} view={view} />
      ) : null}
      {view === "week" ? (
        <DiaryWeek anchor={anchor} today={today} bookings={bookings} bookJob={selected} view={view} />
      ) : null}
      {view === "list" ? <DiaryList anchor={anchor} bookings={bookings} bookJob={selected} view={view} /> : null}

      <DiaryToBook jobs={waiting} selectedId={selected?.id ?? null} view={view} anchor={anchor} />
      <DiaryUpcoming bookings={bookings} today={today} />
    </div>
  );
}
