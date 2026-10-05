import Link from "next/link";
import type { CSSProperties } from "react";
import { formatIsoDate, isIsoDate, londonToday, weekDates } from "@/lib/dates";
import { cardsForDate, diaryFetchWindow, formatDiaryRange } from "@/lib/diary";
import { listDiaryBoard, requireUser } from "@/server/dal";
import { DiaryCardView } from "@/components/diary-card";
import { DiaryWeek } from "@/components/diary-board";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Print diary" };

export default async function DiaryPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; scope?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const today = londonToday();
  const anchor = params.date && isIsoDate(params.date) ? params.date : today;
  const scope = params.scope === "day" ? "day" : "week";
  const window = diaryFetchWindow(anchor, today);
  const bookings = await listDiaryBoard(user.businessId, window.from, window.to);
  const week = weekDates(anchor);
  const heading = scope === "day" ? formatIsoDate(anchor, "long") : formatDiaryRange(week[0], week[6]);

  return (
    <div
      className="diary-print grid gap-4"
      style={{ "--diary-accent": user.branding.accentColour, "--diary-ink": user.branding.accentInk } as CSSProperties}
    >
      <div className="no-print flex flex-wrap gap-2">
        <Link href={`/diary?view=week&date=${anchor}`} className="btn btn-secondary">
          Back to diary
        </Link>
        <PrintButton label={scope === "day" ? "Print this day" : "Print this week"} />
      </div>
      <header>
        <p className="text-sm font-bold uppercase tracking-wide">{user.businessName}</p>
        <h1 className="font-display text-4xl">{heading}</h1>
      </header>
      {scope === "week" ? (
        <DiaryWeek anchor={anchor} today={today} bookings={bookings} bookJob={null} view="week" showDayPrint={false} />
      ) : (
        <div className="grid gap-2">
          {cardsForDate(bookings, anchor).length === 0 ? <p>Nothing booked.</p> : null}
          {cardsForDate(bookings, anchor).map((card) => (
            <DiaryCardView key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
