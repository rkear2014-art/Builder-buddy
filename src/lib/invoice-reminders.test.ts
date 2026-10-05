import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chaseReminderManually,
  cronAuthorised,
  daysPastDue,
  nextReminderStep,
  parseReminderSettings,
  reminderHistoryLabel,
  reminderMessage,
  reminderScheduleOf,
  reminderSubject,
} from "./invoice-reminders";

const open = {
  status: "SENT" as const,
  dueDate: "2026-10-01",
  today: "2026-10-04",
  paidPence: 0,
  totalDuePence: 84076,
  remindersOn: true,
  remindersPaused: false,
  sentSteps: [] as number[],
  schedule: [3, 7, 14] as [number, number, number],
};

describe("invoice reminders", () => {
  it("keeps the default gaps and sorts edited days", () => {
    assert.deepEqual(reminderScheduleOf(undefined, undefined, undefined), [3, 7, 14]);
    const form = new FormData();
    form.set("remindersOn", "yes");
    form.set("reminderDay1", "14");
    form.set("reminderDay2", "3");
    form.set("reminderDay3", "7");
    const parsed = parseReminderSettings(form);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.data, { remindersOn: true, reminderDay1: 3, reminderDay2: 7, reminderDay3: 14 });
  });

  it("rejects matching days and a switched-off form stays off", () => {
    const form = new FormData();
    form.set("remindersOn", "no");
    form.set("reminderDay1", "3");
    form.set("reminderDay2", "3");
    form.set("reminderDay3", "14");
    assert.equal(parseReminderSettings(form).ok, false);
    const off = new FormData();
    off.set("remindersOn", "no");
    off.set("reminderDay1", "2");
    off.set("reminderDay2", "5");
    off.set("reminderDay3", "10");
    const parsed = parseReminderSettings(off);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.remindersOn, false);
  });

  it("sends the next unsent reminder once its day has passed", () => {
    assert.equal(daysPastDue("2026-10-01", "2026-10-01"), 0);
    assert.equal(daysPastDue("2026-10-01", "2026-10-04"), 3);
    assert.equal(nextReminderStep({ ...open, today: "2026-10-03" }), null);
    assert.deepEqual(nextReminderStep(open), { step: 1, afterDays: 3, daysOverdue: 3 });
    assert.equal(nextReminderStep({ ...open, today: "2026-10-08", sentSteps: [1] })?.step, 2);
    assert.equal(nextReminderStep({ ...open, today: "2026-10-20" })?.step, 1);
    assert.equal(nextReminderStep({ ...open, today: "2026-10-20", sentSteps: [1, 2] })?.step, 3);
    assert.equal(nextReminderStep({ ...open, today: "2026-10-20", sentSteps: [1, 2, 3] }), null);
  });

  it("stops for drafts, paid invoices, a pause, and the business switch", () => {
    assert.equal(nextReminderStep({ ...open, status: "DRAFT" }), null);
    assert.equal(nextReminderStep({ ...open, status: "PAID" }), null);
    assert.equal(nextReminderStep({ ...open, paidPence: 84076 }), null);
    assert.equal(nextReminderStep({ ...open, remindersPaused: true }), null);
    assert.equal(nextReminderStep({ ...open, remindersOn: false }), null);
    assert.equal(nextReminderStep({ ...open, status: "PART_PAID", paidPence: 1000 })?.step, 1);
  });

  it("writes a polite reminder with the amount, bank details, and a signature", () => {
    const message = reminderMessage({
      customerName: "Mrs Kear",
      businessName: "AK Plastering",
      reference: "INV-0004",
      balancePence: 84076,
      dueDate: "2026-10-01",
      bankAccountName: "AK Plastering",
      bankSortCode: "12-34-56",
      bankAccountNumber: "12345678",
      url: "https://builder-buddy-seven.vercel.app/invoice/token",
    });
    assert.match(message, /Hello Mrs Kear/);
    assert.match(message, /INV-0004/);
    assert.match(message, /£840\.76/);
    assert.match(message, /1 October 2026/);
    assert.match(message, /Account name: AK Plastering/);
    assert.match(message, /Sort code: 12-34-56/);
    assert.match(message, /Account number: 12345678/);
    assert.match(message, /https:\/\/builder-buddy-seven\.vercel\.app\/invoice\/token/);
    assert.match(message, /Thank you,\nAK Plastering$/);
    assert.equal(reminderSubject("INV-0004", "AK Plastering"), "Reminder: invoice INV-0004 from AK Plastering");
  });

  it("labels history and only authorises the cron secret", () => {
    assert.equal(reminderHistoryLabel(1, new Date("2026-10-08T09:00:00.000Z")), "Reminder 1 sent 8 Oct");
    assert.equal(cronAuthorised("Bearer secret", "secret"), true);
    assert.equal(cronAuthorised("Bearer wrong", "secret"), false);
    assert.equal(cronAuthorised("Bearer secret", ""), false);
    assert.equal(cronAuthorised(null, "secret"), false);
    assert.equal(chaseReminderManually({ emailConfigured: false, customerEmail: "a@b.co", businessEmail: "c@d.co" }), true);
    assert.equal(chaseReminderManually({ emailConfigured: true, customerEmail: "", businessEmail: "c@d.co" }), true);
    assert.equal(chaseReminderManually({ emailConfigured: true, customerEmail: "a@b.co", businessEmail: "c@d.co" }), false);
  });
});
