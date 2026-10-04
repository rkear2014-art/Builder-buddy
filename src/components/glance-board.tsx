"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { JobStatus } from "@/lib/constants";
import type { GlanceCard, GlanceListRow, GlancePage } from "@/lib/glance";
import { formatPence } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

const HIDE_MONEY_KEY = "builder-buddy-hide-money";
const moneyListeners = new Set<() => void>();

function subscribeHideMoney(listener: () => void): () => void {
  moneyListeners.add(listener);
  return () => moneyListeners.delete(listener);
}

function readHideMoney(): boolean {
  return window.localStorage.getItem(HIDE_MONEY_KEY) === "1";
}

function writeHideMoney(hidden: boolean): void {
  window.localStorage.setItem(HIDE_MONEY_KEY, hidden ? "1" : "0");
  for (const listener of moneyListeners) listener();
}

const BAR: Record<JobStatus, string> = {
  ENQUIRY: "#94a3b8",
  BOOKED: "#245a94",
  IN_PROGRESS: "#d97706",
  COMPLETE: "#1d4a36",
};

export function GlanceBoard({ data }: { data: GlancePage }) {
  const hideMoney = useSyncExternalStore(subscribeHideMoney, readHideMoney, () => false);

  function toggleMoney() {
    writeHideMoney(!hideMoney);
  }

  const accent = data.accentColour;

  return (
    <div className="grid gap-4">
      <Hero data={data} />

      <section className="grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-extrabold">At a glance</h2>
          <button type="button" className="text-sm font-extrabold" style={{ color: accent }} onClick={toggleMoney}>
            {hideMoney ? "Show £" : "Hide £"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.cards.map((card) => (
            <GlanceCardView key={card.id} card={card} accent={accent} />
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr]">
        <WeekCard data={data} accent={accent} />
        <MonthCard data={data} accent={accent} hideMoney={hideMoney} />
      </div>

      <RecentCard data={data} />
    </div>
  );
}

function Hero({ data }: { data: GlancePage }) {
  const accent = data.accentColour;
  return (
    <section
      className="relative overflow-hidden rounded-[1.6rem] text-white shadow-sm"
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
            ? "linear-gradient(100deg, rgba(12,16,22,0.94) 0%, rgba(12,16,22,0.78) 46%, rgba(12,16,22,0.28) 100%)"
            : "linear-gradient(100deg, rgba(12,16,22,0.2) 0%, rgba(12,16,22,0) 70%)",
        }}
      />
      {data.logoSrc && !data.heroSrc ? (
        <div className="absolute bottom-8 right-4 top-5 hidden w-36 items-center justify-center rounded-2xl bg-white/95 p-2 sm:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.logoSrc} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
      <div
        className={`relative z-10 px-5 pb-5 pt-6 sm:px-7 sm:pt-7 ${data.logoSrc && !data.heroSrc ? "sm:pr-44" : "max-w-xl"}`}
      >
        <p className="text-xs font-extrabold tracking-wide" style={{ color: `color-mix(in srgb, ${accent} 58%, white)` }}>
          {data.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
          {data.greeting}
          <span style={{ color: `color-mix(in srgb, ${accent} 58%, white)` }}>.</span>
        </h1>
        <p className="mt-3 text-base text-white/85 sm:text-lg">{data.summary}</p>
        {data.chips.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {data.chips.map((chip) => (
              <li key={chip} className="rounded-full bg-white/12 px-3 py-1 text-sm font-bold text-white/90 ring-1 ring-white/15">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="relative z-10 h-1.5" style={{ background: accent }} />
    </section>
  );
}

function GlanceCardView({ card, accent }: { card: GlanceCard; accent: string }) {
  return (
    <article id={card.id === "chase" ? "to-chase" : undefined} className="flex flex-col rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardIcon id={card.id} accent={accent} />
          <h3 className="font-extrabold">{card.title}</h3>
        </div>
        <p className="text-right text-[0.7rem] font-extrabold tracking-wide text-stone">{card.meta}</p>
      </div>
      <p className="mt-3 font-display text-4xl leading-none">{card.value}</p>
      <p className="mt-1 text-sm text-stone">{card.sub}</p>
      <div className="mt-3 grid gap-2 border-t border-line pt-3">
        {card.rows.length === 0 ? <p className="text-sm text-stone">{card.empty}</p> : card.rows.map((row) => <CardRow key={row.id} row={row} accent={accent} />)}
      </div>
      <Link href={card.href} className="mt-auto pt-3 text-right text-sm font-extrabold" style={{ color: accent }}>
        Open →
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
    <section className="rounded-3xl bg-white p-4 shadow-sm">
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
            <p className="font-display text-2xl leading-none">{tile.value}</p>
            <p className="text-xs font-bold text-stone">{tile.label}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 grid gap-2">
        {data.week.rows.length === 0 ? <li className="text-sm text-stone">Nothing booked this week.</li> : null}
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

function MonthCard({ data, accent, hideMoney }: { data: GlancePage; accent: string; hideMoney: boolean }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="font-display text-3xl leading-none">This month · {data.month.title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-3xl bg-[#17171a] p-4 text-white">
          <p className="text-xs font-extrabold tracking-wide text-white/60">PRICED WORK</p>
          <p className="mt-2 font-display text-4xl leading-none">
            {hideMoney ? "Hidden" : formatPence(data.month.totalPence)}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {data.month.jobCount} {data.month.jobCount === 1 ? "job" : "jobs"} this month
          </p>
        </div>
        <div className="rounded-3xl p-4" style={{ background: `color-mix(in srgb, ${accent} 12%, white)` }}>
          <p className="text-xs font-extrabold tracking-wide text-stone">COMPLETE</p>
          <p className="mt-2 font-display text-4xl leading-none">{data.month.completeCount}</p>
          <p className="mt-2 text-sm text-stone">finished this month</p>
        </div>
      </div>
    </section>
  );
}

function RecentCard({ data }: { data: GlancePage }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-extrabold">Recent jobs</h2>
        <Link href="/jobs" className="text-sm font-extrabold" style={{ color: data.accentColour }}>
          All jobs →
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {data.recent.length === 0 ? <li className="py-3 text-sm text-stone">No jobs yet.</li> : null}
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

function CardIcon({ id, accent }: { id: string; accent: string }) {
  const glyph =
    id === "today"
      ? "M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
      : id === "tomorrow"
        ? "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
        : id === "sign-off"
          ? "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 14h8M8 18h5"
          : id === "chase"
            ? "M7 3h10v4a5 5 0 0 1-10 0V3zM8 21h8M12 12v4"
            : "M12 5v14M5 12h14";
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${accent} 14%, white)`, color: accent }}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d={glyph} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
