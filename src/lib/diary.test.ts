import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cardsForDate,
  parseDiaryPlace,
  dayNumberOn,
  dayProgressLabel,
  diaryFetchWindow,
  diaryHref,
  formatDiaryRange,
  isToBook,
  parseSpanDays,
  shiftDiaryAnchor,
  shortJobSummary,
  toBookJobs,
  upcomingDays,
  type DiaryBooking,
} from "./diary";

function booking(overrides: Partial<DiaryBooking> = {}): DiaryBooking {
  return {
    id: "job-1",
    customerName: "Anita Patel",
    postcode: "BS7 8NS",
    summary: "Skim the lounge and hall.",
    status: "BOOKED",
    assignedName: "Sam Hart",
    bookingKind: "job",
    spanDays: 1,
    startDate: "2026-10-06",
    onDiary: true,
    ...overrides,
  };
}

describe("diary bookings", () => {
  it("repeats a multi-day job on each day with Day x/y", () => {
    const job = booking({ spanDays: 3, startDate: "2026-10-06" });
    assert.equal(dayNumberOn(job.startDate, job.spanDays, "2026-10-05"), null);
    assert.equal(dayNumberOn(job.startDate, job.spanDays, "2026-10-06"), 1);
    assert.equal(dayNumberOn(job.startDate, job.spanDays, "2026-10-07"), 2);
    assert.equal(dayNumberOn(job.startDate, job.spanDays, "2026-10-08"), 3);
    assert.equal(dayNumberOn(job.startDate, job.spanDays, "2026-10-09"), null);
    const tuesday = cardsForDate([job], "2026-10-06");
    assert.equal(tuesday.length, 1);
    assert.equal(dayProgressLabel(tuesday[0].dayNumber, tuesday[0].spanDays), "Day 1/3");
    assert.equal(dayProgressLabel(1, 1), null);
  });

  it("shows a quote visit on its day and leaves an unbooked job off the grid", () => {
    const waiting = booking({ onDiary: false, id: "wait" });
    const placed = booking({ id: "placed", customerName: "Helen Brooks", bookingKind: "quote", startDate: "2026-10-06" });
    const cards = cardsForDate([waiting, placed], "2026-10-06");
    assert.deepEqual(
      cards.map((card) => card.customerName),
      ["Helen Brooks"],
    );
  });

  it("lists enquiry, booked and in-progress jobs that still need a day", () => {
    const jobs = [
      booking({ id: "won", onDiary: false, status: "BOOKED", customerName: "Tom Ellis" }),
      booking({ id: "live", onDiary: false, status: "IN_PROGRESS", customerName: "Priya Shah" }),
      booking({ id: "enquiry", onDiary: false, status: "ENQUIRY", customerName: "Chidi Okonkwo" }),
      booking({ id: "done", onDiary: false, status: "COMPLETE", customerName: "Dave Singh" }),
      booking({ id: "dated", onDiary: true, status: "BOOKED", customerName: "Anita Patel" }),
      booking({ id: "lost", onDiary: false, status: "BOOKED", customerName: "Lost Job", quoteStage: "LOST" }),
    ];
    assert.equal(isToBook(jobs[0]), true);
    assert.deepEqual(
      toBookJobs(jobs).map((job) => job.customerName),
      ["Chidi Okonkwo", "Priya Shah", "Tom Ellis"],
    );
  });

  it("builds the upcoming list from today and skips empty days", () => {
    const rows = upcomingDays(
      [booking({ startDate: "2026-10-05", spanDays: 2, customerName: "Helen Brooks" })],
      "2026-10-05",
      7,
    );
    assert.deepEqual(
      rows.map((row) => row.date),
      ["2026-10-05", "2026-10-06"],
    );
    assert.equal(rows[1].cards[0].dayNumber, 2);
  });

  it("names the week, including a range that crosses a month", () => {
    assert.equal(formatDiaryRange("2026-10-05", "2026-10-11"), "5 Oct – 11 Oct 2026");
    assert.equal(formatDiaryRange("2026-09-28", "2026-10-04"), "28 Sep – 4 Oct 2026");
    assert.equal(formatDiaryRange("2025-12-29", "2026-01-04"), "29 Dec 2025 – 4 Jan 2026");
    assert.equal(shiftDiaryAnchor("week", "2026-10-05", 1), "2026-10-12");
    assert.equal(shiftDiaryAnchor("month", "2026-10-31", 1), "2026-11-30");
    assert.equal(diaryHref({ view: "week", date: "2026-10-05", book: "abc" }), "/diary?view=week&date=2026-10-05&book=abc");
    assert.equal(
      diaryHref({ view: "week", date: "2026-10-07", pick: "2026-10-07" }),
      "/diary?view=week&date=2026-10-07&pick=2026-10-07",
    );
  });

  it("looks far enough back to catch a job that started before the week", () => {
    const window = diaryFetchWindow("2026-10-05", "2026-10-05");
    assert.ok(window.from <= "2026-09-05");
    assert.ok(window.to >= "2026-10-25");
  });

  it("keeps a blank day count as one day and refuses an invented long run", () => {
    assert.deepEqual(parseSpanDays(""), { ok: true, days: 1 });
    assert.deepEqual(parseSpanDays("3"), { ok: true, days: 3 });
    assert.equal(parseSpanDays("0").ok, false);
    assert.equal(parseSpanDays("32").ok, false);
    assert.equal(shortJobSummary("", "quote"), "Quote visit");
    assert.equal(shortJobSummary("Skim the lounge.", "job"), "Skim the lounge.");
  });

  it("reads a diary date, the days, and a quote visit", () => {
    const form = new FormData();
    form.set("scheduledDate", "2026-10-07");
    form.set("spanDays", "2");
    form.set("bookingKind", "quote");
    const parsed = parseDiaryPlace(form);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.scheduledDate, "2026-10-07");
    assert.equal(parsed.data.spanDays, 2);
    assert.equal(parsed.data.bookingKind, "quote");
    form.set("scheduledDate", "");
    assert.equal(parseDiaryPlace(form).ok, false);
  });
});
