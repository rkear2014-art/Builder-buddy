import Link from "next/link";
import { STATUS_LABELS } from "@/lib/constants";
import { bookingKindLabel, dayProgressLabel, type DiaryCard } from "@/lib/diary";

export function DiaryCardView({ card, compact = false }: { card: DiaryCard; compact?: boolean }) {
  const progress = dayProgressLabel(card.dayNumber, card.spanDays);
  return (
    <Link href={`/jobs/${card.id}`} className={`diary-card diary-card-${card.bookingKind}`}>
      <span className="text-xs font-extrabold leading-tight">{bookingKindLabel(card.bookingKind)}</span>
      {progress ? <span className="text-xs font-extrabold leading-tight">{progress}</span> : null}
      <span className={`block font-extrabold leading-tight ${compact ? "text-sm" : "text-base"}`}>{card.customerName}</span>
      {card.postcode ? <span className="block text-xs font-bold">{card.postcode}</span> : null}
      <span className={`block text-stone ${compact ? "line-clamp-3 text-xs" : "text-sm"}`}>{card.summary}</span>
      <span className="diary-pill">{STATUS_LABELS[card.status]}</span>
      <span className={`block font-semibold ${compact ? "text-[0.7rem]" : "text-sm"}`}>{card.assignedName}</span>
    </Link>
  );
}
