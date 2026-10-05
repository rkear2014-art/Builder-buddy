import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogueCoversEveryStarter, catalogueGroupsFor, defaultTileSource, fittingHeroId } from "./catalogue";
import {
  enabledTrades,
  isEnabledTrade,
  isTrade,
  singleEnabledTrade,
  tradeLabel,
  visibleTradeLabel,
} from "./constants";
import { quoteMessage, whatsAppDigits, whatsAppHref } from "./customer-message";
import { quoteStatusLabel } from "./job-desk";
import { depositFromPercent, paymentNote, percentFromDeposit } from "./quote";
import { surveyForTrade, surveyProgress, toggleSurveyStored } from "./survey";
import { parseBookingForm, parseJobForm } from "./validators";

function jobForm(extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    customerName: "Mrs Priya Nair",
    address: "18 Oakfield Road, Redditch, B97 6NE",
    phone: "07700 900441",
    email: "priya.nair@example.com",
    description: "Skim the lounge.",
    scheduledDate: "2026-10-04",
    timeSlot: "morning",
    status: "ENQUIRY",
    ...extra,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("plastering-only desk", () => {
  it("offers plastering and still recognises a job saved under another trade", () => {
    assert.deepEqual(enabledTrades(), ["Plasterer"]);
    assert.equal(singleEnabledTrade(), "Plasterer");
    assert.equal(tradeLabel("Plasterer"), "Plastering");
    assert.equal(visibleTradeLabel("Plasterer"), null);
    assert.equal(isEnabledTrade("Electrician"), false);
    assert.equal(isTrade("Electrician"), true);
    assert.equal(visibleTradeLabel("Electrician"), "Electrical");
    assert.equal(catalogueGroupsFor("Electrician").length, 0);
    assert.equal(catalogueGroupsFor("Plasterer").length, 5);
  });

  it("defaults a new job to plastering when the form has no trade", () => {
    const parsed = parseJobForm(jobForm());
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.data.trade, "Plasterer");
    const kept = parseJobForm(jobForm({ trade: "Plumber" }));
    assert.equal(kept.ok, true);
    if (kept.ok) assert.equal(kept.data.trade, "Plumber");
  });

  it("books a job from the site address fields and keeps the combined line", () => {
    const form = new FormData();
    form.set("customerName", "Mrs Patel");
    form.set("postcode", "bs78ns");
    form.set("addressLine1", "14 Larkspur Road");
    form.set("town", "Bristol");
    form.set("phone", "07700 900123");
    form.set("scheduledDate", "2026-10-05");
    form.set("timeSlot", "morning");
    const parsed = parseBookingForm(form);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.address, "14 Larkspur Road, Bristol BS7 8NS");
    assert.equal(parsed.data.postcode, "BS7 8NS");
    assert.equal(parsed.data.description, "");
    assert.equal(parsed.data.trade, "Plasterer");
    assert.equal(parsed.data.bookingKind, "job");
    assert.equal(parsed.data.spanDays, 1);
    assert.equal(parsed.data.onDiary, true);
    assert.equal(parsed.data.status, "ENQUIRY");
    const missing = parseBookingForm(form);
    form.set("addressLine1", "");
    assert.equal(parseBookingForm(form).ok, false);
    assert.equal(missing.ok, true);
  });

  it("books a quote visit, and a won job with the date still to book", () => {
    const form = new FormData();
    form.set("customerName", "Mrs Patel");
    form.set("postcode", "BS7 8NS");
    form.set("addressLine1", "14 Larkspur Road");
    form.set("phone", "07700 900123");
    form.set("scheduledDate", "2026-10-06");
    form.set("timeSlot", "morning");
    form.set("bookingKind", "quote");
    form.set("spanDays", "2");
    form.set("assignedName", "Sam");
    const visit = parseBookingForm(form);
    assert.equal(visit.ok, true);
    if (!visit.ok) return;
    assert.equal(visit.data.bookingKind, "quote");
    assert.equal(visit.data.spanDays, 2);
    assert.equal(visit.data.assignedName, "Sam");
    assert.equal(visit.data.onDiary, true);
    form.set("dateToBook", "yes");
    form.set("bookingKind", "job");
    const waiting = parseBookingForm(form);
    assert.equal(waiting.ok, true);
    if (!waiting.ok) return;
    assert.equal(waiting.data.onDiary, false);
    assert.equal(waiting.data.status, "BOOKED");
    form.set("spanDays", "40");
    assert.equal(parseBookingForm(form).ok, false);
  });
});

describe("job desk helpers", () => {
  it("names the quoting strip and the way back to a draft", () => {
    assert.deepEqual(quoteStatusLabel("ENQUIRY", true), {
      pill: "Quoting · prices shown",
      toggle: "Back to draft (hide prices)",
      showPrices: false,
    });
    assert.equal(quoteStatusLabel("BOOKED", false).pill, "Booked · prices hidden");
  });

  it("stores a survey tick and ignores a key from another trade", () => {
    const plaster = surveyForTrade("Plasterer");
    assert.equal(plaster.length, 12);
    assert.equal(surveyForTrade("Electrician").some((item) => item.key === "artex"), false);
    const stored = toggleSurveyStored("", "rooms", true, plaster.map((item) => item.key));
    assert.equal(surveyProgress("Plasterer", stored).done, 1);
    assert.equal(toggleSurveyStored(stored, "consumer-unit", true, plaster.map((item) => item.key)), stored);
  });

  it("uses a work photo only when that photo is on the business", () => {
    assert.equal(catalogueCoversEveryStarter(), true);
    const photos = [
      { id: "flats", sourceKey: "ak-flats" },
      { id: "room", sourceKey: "ak-living-room" },
    ];
    assert.equal(fittingHeroId("plaster-render", photos), "flats");
    assert.equal(fittingHeroId("plaster-skim", photos), "room");
    assert.equal(fittingHeroId("plaster-screed", photos), null);
    assert.equal(fittingHeroId("plaster-render", []), null);
    const shown = catalogueGroupsFor("Plasterer").flatMap((group) => group.starterIds);
    assert.equal(shown.includes("plaster-skim"), false);
    assert.equal(shown.includes("plaster-two-coat"), false);
    assert.equal(shown.includes("plaster-general"), true);
    for (const id of shown) assert.ok(defaultTileSource(id), id);
  });

  it("turns a deposit percentage into the amount the quotation stores", () => {
    assert.equal(depositFromPercent(130000, 25), 32500);
    assert.equal(depositFromPercent(0, 25), null);
    assert.equal(depositFromPercent(130000, 0), null);
    assert.equal(percentFromDeposit(130000, 32500), 25);
    assert.match(paymentNote(null), /No deposit required/);
    assert.match(paymentNote(32500), /£325\.00/);
  });

  it("builds a message the tradesperson sends from their own phone", () => {
    const message = quoteMessage({
      customerName: "Mrs Priya Nair",
      businessName: "Hart & Co",
      url: "https://example.test/sign/abc",
    });
    assert.match(message, /https:\/\/example\.test\/sign\/abc/);
    assert.equal(message.includes("£"), false);
    assert.equal(whatsAppDigits("07512 873562"), "447512873562");
    assert.match(whatsAppHref("07512 873562", "Hello"), /^https:\/\/wa\.me\/447512873562\?text=/);
  });
});
