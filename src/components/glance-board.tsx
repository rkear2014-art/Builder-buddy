"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import type { JobStatus } from "@/lib/constants";
import type { GlanceCard, GlanceListRow, GlancePage } from "@/lib/glance";
import { HERO_VISIT_COOKIE } from "@/lib/heroes";
import { formatPence } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

const HIDE_EMPTY_KEY = "builder-buddy-hide-empty";
const emptyListeners = new Set<() => void>();

function subscribeHideEmpty(listener: () => void): () => void {
  emptyListeners.add(listener);
  return () => emptyListeners.delete(listener);
}

function readHideEmpty(): boolean {
  return window.localStorage.getItem(HIDE_EMPTY_KEY) === "1";
}

function writeHideEmpty(hidden: boolean): void {
  window.localStorage.setItem(HIDE_EMPTY_KEY, hidden ? "1" : "0");
  for (const listener of emptyListeners) listener();
}

function cardIsEmpty(card: GlanceCard): boolean {
  if (card.rows.length > 0) return false;
  if (card.moneyPence != null) return card.moneyPence === 0;
  return card.value === "0";
}

function cardAction(id: string): string {
  return id === "today" || id === "tomorrow" ? "Open diary →" : "View all →";
}

const BAR: Record<JobStatus, string> = {
  ENQUIRY: "#94a3b8",
  BOOKED: "#245a94",
  IN_PROGRESS: "#d97706",
  COMPLETE: "#1d4a36",
};

export function GlanceBoard({ data }: { data: GlancePage }) {
  const hideEmpty = useSyncExternalStore(subscribeHideEmpty, readHideEmpty, () => false);
  const accent = data.accentColour;
  const cards = hideEmpty ? data.cards.filter((card) => !cardIsEmpty(card)) : data.cards;

  return (
    <div className="grid gap-3">
      <Hero data={data} />
      <DeskShortcuts data={data} />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">At a glance</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-stone"
            aria-pressed={hideEmpty}
            onClick={() => writeHideEmpty(!hideEmpty)}
          >
            {hideEmpty ? "Show empty" : "Hide empty"}
            <EyeIcon off={hideEmpty} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <GlanceCardView key={card.id} card={card} accent={accent} />
          ))}
        </div>
      </section>

      {data.readyToBook.length > 0 ? <ReadyToBook data={data} /> : null}

      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr]">
        <WeekCard data={data} accent={accent} />
        <MonthCard data={data} accent={accent} />
      </div>

      <RecentCard data={data} />
    </div>
  );
}

function Hero({ data }: { data: GlancePage }) {
  const accent = data.accentColour;
  useEffect(() => {
    if (!data.heroId) return;
    document.cookie = `${HERO_VISIT_COOKIE}=${encodeURIComponent(data.heroId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [data.heroId]);
  return (
    <section
      className="soft-card relative overflow-hidden text-white"
      style={{
        background: data.heroSrc
          ? "#12161c"
          : `linear-gradient(115deg, #14181f 0%, #243044 48%, color-mix(in srgb, ${accent} 70%, #b7aa9c) 100%)`,
      }}
    >
      {data.heroSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background: data.heroSrc
            ? "linear-gradient(100deg, rgba(8,10,14,0.88) 0%, rgba(8,10,14,0.55) 42%, rgba(8,10,14,0.12) 100%)"
            : "linear-gradient(100deg, rgba(12,16,22,0.35) 0%, rgba(12,16,22,0) 70%)",
        }}
      />
      {data.logoSrc ? (
        <div className="absolute right-4 top-1/2 z-10 flex h-[4.5rem] w-[4.5rem] -translate-y-[60%] items-center justify-center rounded-full bg-white p-1.5 shadow-md sm:h-20 sm:w-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.logoSrc} alt="" className="h-full w-full rounded-full object-contain" />
        </div>
      ) : null}
      <div className={`relative z-10 px-5 pb-5 pt-6 sm:px-6 ${data.logoSrc ? "pr-24 sm:pr-28" : ""}`}>
        <p className="text-xs font-extrabold tracking-wide" style={{ color: accent, textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
          {data.businessName.toUpperCase()}
        </p>
        <h1
          className="mt-1 max-w-[18rem] font-display text-4xl leading-none tracking-tight text-white sm:text-5xl"
          style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
        >
          {data.greeting}
          <span style={{ color: accent }}>.</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-white sm:text-base" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.65)" }}>
          Here&apos;s what&apos;s happening with your business today.
        </p>
        <Link
          href="/library"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/80 px-3.5 py-2 text-sm font-bold text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
          </svg>
          Recent {data.businessName} work
        </Link>
      </div>
      <div className="relative z-10 h-1.5" style={{ background: accent }} />
    </section>
  );
}

function DeskShortcuts({ data }: { data: GlancePage }) {
  const accent = data.accentColour;
  return (
    <section className="grid gap-3" aria-label="Shortcuts">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/jobs/new"
          className="flex min-h-[5.5rem] items-center gap-3 rounded-3xl px-4 py-4 shadow-sm"
          style={{ background: accent, color: data.accentInk }}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 3v5h5M12 12v6M9 15h6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-3xl leading-none">New job</span>
            <span className="mt-1 block text-sm font-semibold leading-snug">Book in a job or a quote visit, with a date</span>
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20">
            <Chevron />
          </span>
        </Link>
        <Link
          href="/choose"
          className="flex min-h-[5.5rem] items-center gap-3 rounded-3xl bg-[#17171a] px-4 py-4 text-white shadow-sm"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-3xl leading-none">Choose a job</span>
            <span className="mt-1 block text-sm font-semibold leading-snug text-white/75">Open the photo tiles for this week&apos;s work</span>
          </span>
          <Chevron />
        </Link>
      </div>
      <nav className="grid grid-cols-3 overflow-hidden rounded-2xl bg-white shadow-sm" aria-label="Quotes, invoices and business">
        <Segment href="/quotes" label="Quotes" icon="quotes" />
        <Segment href="/invoices" label="Invoices" icon="invoices" />
        <Segment href="/" label="Business" icon="chart" active accent={accent} />
      </nav>
    </section>
  );
}

function ReadyToBook({ data }: { data: GlancePage }) {
  const accent = data.accentColour;
  return (
    <section className="rounded-3xl border border-[#178a45] bg-[#e8f6ee] p-4" aria-label="Signed, ready to book">
      <h2 className="font-display text-3xl text-[#178a45]">Signed, ready to book</h2>
      <ul className="mt-3 grid gap-2">
        {data.readyToBook.map((job) => (
          <li key={job.id} className="grid gap-2 rounded-2xl bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-lg font-extrabold">{job.customerName}</p>
              <p className="text-sm font-bold text-stone">{job.signed ? "Customer signed. Book the job in." : "Won. Book the job in."}</p>
            </div>
            <Link href={`/jobs/${job.id}/book`} className="btn min-h-14 text-lg" style={{ background: accent, color: data.accentInk }}>
              Book the job in
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Segment({
  href,
  label,
  icon,
  active = false,
  accent,
}: {
  href: string;
  label: string;
  icon: "quotes" | "invoices" | "chart";
  active?: boolean;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-1 border-r border-line px-2 py-3 text-sm font-extrabold last:border-r-0 ${active ? "" : "text-ink"}`}
      style={active && accent ? { color: accent } : undefined}
    >
      <SegmentIcon name={icon} />
      {label}
      {active && accent ? <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full" style={{ background: accent }} /> : null}
    </Link>
  );
}

function GlanceCardView({ card, accent }: { card: GlanceCard; accent: string }) {
  return (
    <article id={card.id === "chase" ? "to-chase" : undefined} className="soft-card flex flex-col p-3.5">
      <div className="flex items-start justify-between gap-2">
        <CardIcon id={card.id} accent={accent} />
        <p className="text-right text-[0.62rem] font-extrabold tracking-wide text-stone">{card.meta}</p>
      </div>
      <h3 className="mt-2 text-sm font-extrabold">{card.title}</h3>
      <p className="mt-1 font-display text-4xl leading-none tracking-tight tabular-nums">{card.value}</p>
      <p className="mt-1 text-xs text-stone">{card.sub}</p>
      <div className="mt-3 grid gap-2">
        {card.rows.length === 0 ? (
          <div className="grid justify-items-center gap-1 py-2 text-center">
            <CardIcon id="empty" accent={accent} />
            <p className="text-xs font-semibold text-stone">{card.empty}</p>
          </div>
        ) : (
          card.rows.map((row) => <CardRow key={row.id} row={row} accent={accent} />)
        )}
      </div>
      <Link href={card.href} className="mt-auto pt-3 text-right text-sm font-extrabold" style={{ color: accent }}>
        {cardAction(card.id)}
      </Link>
    </article>
  );
}

function CardRow({ row, accent }: { row: GlanceListRow; accent: string }) {
  const colour = row.metaTone === "late" ? "#8d3428" : row.metaTone === "today" ? accent : "#655e55";
  return (
    <Link href={row.href} className="grid grid-cols-[1fr_auto] gap-2 text-sm">
      <span>
        <span className="block font-extrabold">{row.primary}</span>
        <span className="text-stone">{row.secondary}</span>
      </span>
      <span className="font-extrabold" style={{ color: colour }}>
        {row.meta}
      </span>
    </Link>
  );
}

function WeekCard({ data, accent }: { data: GlancePage; accent: string }) {
  return (
    <section className="soft-card p-4">
      <p className="text-xs font-extrabold tracking-wide" style={{ color: accent }}>
        {data.week.eyebrow}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl leading-none">This week</h2>
        <Link href="/diary" className="text-sm font-extrabold" style={{ color: accent }}>
          Diary →
        </Link>
      </div>
      <p className="mt-1 text-sm text-stone">{data.week.range}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.week.tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl bg-[#f4f6f8] px-3 py-2">
            <p className="font-display text-3xl leading-none tracking-tight tabular-nums">{tile.value}</p>
            <p className="text-xs font-bold text-stone">{tile.label}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 grid gap-2">
        {data.week.rows.length === 0 ? (
          <li>
            <EmptyState compact>Nothing booked this week.</EmptyState>
          </li>
        ) : null}
        {data.week.rows.map((row) => (
          <li key={row.id}>
            <Link href={row.href} className="grid grid-cols-[0.35rem_5.5rem_1fr_auto] items-center gap-3 rounded-2xl px-1 py-1">
              <span className="h-10 rounded-full" style={{ background: row.status === "BOOKED" ? accent : BAR[row.status] }} />
              <span className="text-sm font-extrabold">{row.when}</span>
              <span className="min-w-0">
                <span className="block truncate font-extrabold">{row.customerName}</span>
                <span className="block truncate text-sm text-stone">{row.detail}</span>
              </span>
              <StatusBadge status={row.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MonthCard({ data, accent }: { data: GlancePage; accent: string }) {
  return (
    <section className="soft-card p-4">
      <h2 className="font-display text-3xl leading-none tracking-tight">This month · {data.month.title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-3xl bg-[#17171a] p-4 text-white">
          <p className="text-xs font-extrabold tracking-wide text-white/60">PRICED WORK</p>
          <p className="mt-2 font-display text-5xl leading-none tracking-tight tabular-nums">
            {formatPence(data.month.totalPence)}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {data.month.jobCount} {data.month.jobCount === 1 ? "job" : "jobs"} this month
          </p>
        </div>
        <div className="rounded-3xl p-4" style={{ background: `color-mix(in srgb, ${accent} 12%, white)` }}>
          <p className="text-xs font-extrabold tracking-wide text-stone">COMPLETE</p>
          <p className="mt-2 font-display text-5xl leading-none tracking-tight tabular-nums">{data.month.completeCount}</p>
          <p className="mt-2 text-sm text-stone">finished this month</p>
        </div>
      </div>
    </section>
  );
}

function RecentCard({ data }: { data: GlancePage }) {
  return (
    <section className="soft-card p-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-extrabold">Recent jobs</h2>
        <Link href="/jobs" className="text-sm font-extrabold" style={{ color: data.accentColour }}>
          All jobs →
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {data.recent.length === 0 ? (
          <li className="py-3">
            <EmptyState compact>No jobs yet.</EmptyState>
          </li>
        ) : null}
        {data.recent.map((row) => (
          <li key={row.id}>
            <Link href={row.href} className="flex items-center gap-3 py-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white"
                style={{ background: data.accentColour, color: data.accentInk }}
              >
                {row.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{row.customerName}</span>
                <span className="block truncate text-sm text-stone">{row.detail}</span>
              </span>
              <span className="text-right">
                <StatusBadge status={row.status} />
                <span className="mt-1 block text-xs font-bold text-stone">{row.when}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const CARD_GLYPH: Record<string, string> = {
  today: "M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  tomorrow: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  "sign-off": "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 14l2 2 4-4",
  chase: "M6 4h12v3a6 6 0 0 1-12 0V4zM8 21h8M12 13v3",
  new: "M12 5v14M5 12h14",
  overdue: "M12 8v5M12 16.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  "paid-month": "M8 12.5l2.5 2.5L16 9M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  empty: "M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
};

function CardIcon({ id, accent }: { id: string; accent: string }) {
  return (
    <span
      className="grid h-8 w-8 place-items-center rounded-lg"
      style={{ background: `color-mix(in srgb, ${accent} 14%, white)`, color: accent }}
    >
      {id === "owed" ? (
        <span className="text-base font-extrabold leading-none">£</span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d={CARD_GLYPH[id] ?? CARD_GLYPH.new} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
      {off ? <path d="M4 4l16 16" strokeLinecap="round" /> : null}
    </svg>
  );
}

function SegmentIcon({ name }: { name: "quotes" | "invoices" | "chart" }) {
  const path =
    name === "chart"
      ? "M5 19V10M12 19V5M19 19v-7"
      : name === "invoices"
        ? "M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21V3zM9 8h6M9 12h6"
        : "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 13h8M8 17h5";
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
