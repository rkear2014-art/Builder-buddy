import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicBaseUrl } from "./base-url";
import { brandedEmailHtml, canSendBrandedEmail } from "./branded-email";
import { formatDocumentNumber, quoteIsExpired } from "./documents";
import { balancePence, invoiceStanding, invoiceTotals, statusAfterPayment } from "./invoice";
import { trustBadges } from "./trust";

describe("customer finish", () => {
  it("numbers quotes and invoices per business", () => {
    assert.equal(formatDocumentNumber("Q", 1), "Q-0001");
    assert.equal(formatDocumentNumber("INV", 12), "INV-0012");
  });

  it("expires an unsigned quote after the valid-until date and keeps a signed one", () => {
    assert.equal(quoteIsExpired("2026-10-01", "2026-10-04", false), true);
    assert.equal(quoteIsExpired("2026-10-04", "2026-10-04", false), false);
    assert.equal(quoteIsExpired("2026-10-01", "2026-10-04", true), false);
  });

  it("works out invoice standing, the deposit deduction, and the balance", () => {
    const totals = invoiceTotals({
      lines: [
        { quantity: "2", unitPricePence: 1000 },
        { quantity: "1", unitPricePence: null },
      ],
      vatRegistered: false,
      vatRatePercent: 20,
      depositPence: 500,
    });
    assert.equal(totals.duePence, 1500);
    assert.equal(balancePence(totals.duePence, 400), 1100);
    assert.equal(
      invoiceStanding({ status: "SENT", dueDate: "2026-10-01", today: "2026-10-04", paidPence: 0, totalDuePence: 1500 }),
      "Overdue",
    );
    assert.equal(
      invoiceStanding({ status: "SENT", dueDate: "2026-10-01", today: "2026-10-04", paidPence: 1500, totalDuePence: 1500 }),
      "Paid",
    );
    assert.equal(statusAfterPayment(400, 1500, false), "PART_PAID");
    assert.equal(
      invoiceStanding({ status: "DRAFT", dueDate: "2026-10-01", today: "2026-10-04", paidPence: 0, totalDuePence: 1500 }),
      "Draft",
    );
  });

  it("builds trust badges and a review link without inventing insurance", () => {
    assert.deepEqual(
      trustBadges({
        insurer: "Hiscox",
        coverAmount: "£2 million",
        guarantee: "12 months",
        accreditations: "Federation of Plastering and Drywall Contractors",
        reviewUrl: "https://g.page/example",
      }),
      [
        "Public liability: Hiscox · £2 million",
        "12 months workmanship guarantee",
        "Federation of Plastering and Drywall Contractors",
      ],
    );
    assert.deepEqual(
      trustBadges({ insurer: "", coverAmount: "", guarantee: "", accreditations: "", reviewUrl: "" }),
      [],
    );
  });

  it("prefers APP_BASE_URL for customer links", () => {
    assert.equal(publicBaseUrl({ APP_BASE_URL: "https://app.plastererinredditch.co.uk/" }, "http://127.0.0.1:3000"), "https://app.plastererinredditch.co.uk");
    assert.equal(publicBaseUrl({ APP_ORIGIN: "https://builder-buddy.example.com" }, "http://127.0.0.1:3000"), "https://builder-buddy.example.com");
    assert.equal(publicBaseUrl({}, "http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  });

  it("builds a branded email only when Resend is configured", () => {
    assert.equal(canSendBrandedEmail({}), false);
    assert.equal(canSendBrandedEmail({ RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "quotes@plastererinredditch.co.uk" }), true);
    const html = brandedEmailHtml({
      businessName: "AK Plastering",
      accent: "#dd1f29",
      logoSrc: "https://app.example/logo",
      headline: "Your quotation",
      body: "Please have a look.",
      buttonLabel: "Open the quotation",
      buttonHref: "https://app.example/sign/abc",
      badges: ["12 months workmanship guarantee"],
      footer: "AK Plastering · Redditch",
    });
    assert.match(html, /Open the quotation/);
    assert.match(html, /https:\/\/app\.example\/sign\/abc/);
    assert.match(html, /#dd1f29/);
    assert.equal(html.includes("<script"), false);
  });
});
