import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGlance, glanceChips, glanceSummary, isChaseJob, type GlanceJob } from "./glance";

function job(overrides: Partial<GlanceJob> & Pick<GlanceJob, "id" | "scheduledDate" | "status">): GlanceJob {
  return {
    customerName: "Jane Kear",
    address: "1 High Street, Redditch, B97 4LD",
    trade: "Plasterer",
    timeSlot: "all-day",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    assigneeName: "Richard Kear",
    signed: false,
    totalPence: 0,
    ...overrides,
  };
}

describe("dashboard glance", () => {
  it("builds the hero line from bookings, follow-ups and jobs still to book in", () => {
    assert.equal(
      glanceSummary({ bookingsToday: 1, chaseCount: 2, toBookCount: 1 }),
      "1 booking today · 2 to chase · 1 job to book in",
    );
    assert.equal(glanceSummary({ bookingsToday: 0, chaseCount: 0, toBookCount: 0 }), "0 bookings today");
    assert.deepEqual(glanceChips("Qualitative Wall Finishing", "38 Birchfield Rd, Redditch, Worcestershire B97 4LD"), [
      "Qualitative Wall Finishing",
      "Redditch",
    ]);
    assert.deepEqual(glanceChips("", ""), []);
  });

  it("chases overdue sign-offs and stale enquiries, and does not invent quotes", () => {
    const today = "2026-10-04";
    assert.equal(isChaseJob(job({ id: "a", scheduledDate: today, status: "BOOKED" }), today), true);
    assert.equal(isChaseJob(job({ id: "b", scheduledDate: "2026-10-03", status: "IN_PROGRESS" }), today), true);
    assert.equal(isChaseJob(job({ id: "c", scheduledDate: "2026-10-05", status: "BOOKED" }), today), false);
    assert.equal(isChaseJob(job({ id: "d", scheduledDate: "2026-10-02", status: "ENQUIRY" }), today), true);
    assert.equal(
      isChaseJob(job({ id: "e", scheduledDate: today, status: "BOOKED", signed: true }), today),
      false,
    );

    const glance = buildGlance({
      today,
      hour: 18,
      now: new Date("2026-10-04T17:00:00.000Z"),
      businessName: "AK Plastering",
      enquiryCount: 1,
      jobs: [
        job({
          id: "today",
          scheduledDate: today,
          status: "BOOKED",
          customerName: "Jane Kear",
          totalPence: 4200,
          updatedAt: "2026-10-04T15:00:00.000Z",
        }),
        job({
          id: "overdue",
          scheduledDate: "2026-10-02",
          status: "BOOKED",
          customerName: "Mrs Sutherland",
          address: "8 Other Road, Redditch, B97 6NH",
        }),
        job({
          id: "tomorrow",
          scheduledDate: "2026-10-05",
          status: "BOOKED",
          customerName: "Mrs Sutherland",
          signed: false,
          totalPence: 1000,
        }),
        job({
          id: "enquiry",
          scheduledDate: "2026-10-01",
          status: "ENQUIRY",
          customerName: "Mr Kear",
          createdAt: "2026-10-04T12:00:00.000Z",
        }),
      ],
    });

    assert.equal(glance.greeting, "Good evening");
    assert.match(glance.eyebrow, /AK PLASTERING · SUNDAY 4 OCTOBER/);
    assert.equal(glance.summary, "1 booking today · 3 to chase · 1 job to book in");
    assert.equal(glance.chaseCount, 3);
    assert.deepEqual(
      glance.cards.map((card) => card.id),
      ["today", "tomorrow", "sign-off", "chase", "new"],
    );
    assert.equal(glance.cards.find((card) => card.id === "today")?.value, "1");
    assert.equal(glance.cards.find((card) => card.id === "sign-off")?.value, "1");
    assert.equal(glance.cards.find((card) => card.id === "new")?.value, "1");
    assert.equal(glance.month.totalPence, 5200);
    assert.equal(glance.week.rows[0]?.detail.includes("Richard"), true);
    assert.equal(JSON.stringify(glance).includes("Quotes sent"), false);
    assert.equal(JSON.stringify(glance).includes("Unpaid invoices"), false);
  });
});
