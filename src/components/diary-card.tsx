import Link from "next/link";
import { STATUS_LABELS } from "@/lib/constants";
import { formatWeekday } from "@/lib/dates";
import { bookingKindLabel, dayProgressLabel, type DiaryCard } from "@/lib/diary";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function DiaryCardView({ card, compact = false }: { card: DiaryCard; compact?: boolean }) {
  const progress = dayProgressLabel(card.dayNumber, card.spanDays);
  const detail = [card.postcode, card.summary].filter(Boolean).join(" · ");
  if (!compact) {
    return (
      <Link href={`/jobs/${card.id}`} className={`diary-row diary-row-${card.bookingKind}`}>
        <span className="diary-row-date">
          <span>{formatWeekday(card.date)}</span>
          <span>{Number(card.date.slice(8))}</span>
        </span>
        <span className="min-w-0">
          <span className="diary-kicker">
            {bookingKindLabel(card.bookingKind)}
            {progress ? ` · ${progress}` : card.spanDays > 1 ? ` · ${card.spanDays} days` : ""}
          </span>
          <span className="mt-0.5 block text-lg font-extrabold leading-tight">{card.customerName}</span>
          <span className="mt-0.5 block text-sm text-stone">{detail}</span>
          <span className="mt-1 block text-sm font-semibold">{card.assignedName}</span>
        </span>
        <span className="diary-status">{STATUS_LABELS[card.status]}</span>
      </Link>
    );
  }
  return (
    <Link href={`/jobs/${card.id}`} className={`diary-cell diary-cell-${card.bookingKind}`}>
      <span className="diary-kicker">
        {bookingKindLabel(card.bookingKind)}
        {progress ? ` · ${progress}` : ""}
      </span>
      <span className="mt-0.5 block text-sm font-extrabold leading-tight">{card.customerName}</span>
      <span className="mt-0.5 line-clamp-2 text-xs leading-tight text-stone">{detail}</span>
      <span className="mt-1 flex items-center justify-between gap-1 text-[0.7rem] font-bold leading-tight">
        <span>{STATUS_LABELS[card.status]}</span>
        <span className="truncate">{firstName(card.assignedName)}</span>
      </span>
    </Link>
  );
}
