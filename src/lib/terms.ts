/** Standard plastering terms. The title and footer use the business saved on the letterhead. */
const TERMS_CLAUSES = `1. Quotes. Quotes are valid for 30 days. They're based on what we could see when we visited, so hidden problems like blown plaster, damp or rotten laths will be priced separately and agreed with you before we do that work.

2. Accepting the quote. Signing the quote, or confirming by text or email, means you accept these terms.

3. Deposit and payment. We ask for a deposit of 25% to book your start date. The balance is due on completion, unless we agree stage payments for bigger jobs. Invoices are payable within 7 days by bank transfer.

4. Late payment. Overdue invoices may be charged interest and costs under the Late Payment of Commercial Debts Act, or at 8% a year for domestic customers.

5. Extra work. Anything not on the quote is extra and will be agreed with you before we start it.

6. Getting the room ready. Please clear the rooms and take down curtains, pictures and fixtures before we arrive. We'll put down dust sheets, but we're not responsible for items left in the room.

7. Access and facilities. Please give us clear access, parking where possible, and use of water, electricity and a toilet.

8. Electrics and other trades. You'll need an electrician to make sockets and switches safe beforehand. We don't move or refit them unless that's agreed.

9. Drying and decorating. New plaster takes about 2–4 weeks to dry, depending on the weather and ventilation. Seal it with a mist coat first. Small hairline cracks while it dries are normal and aren't a fault.

10. Delays. Start dates may move because of weather, illness, supplier delays or earlier jobs overrunning. We'll let you know as soon as we can.

11. Cancellation. You can cancel within 14 days of accepting under consumer law. If you ask us to start within those 14 days and then cancel, you'll pay for work done and materials ordered. Later cancellations may lose the deposit.

12. Guarantee. Our workmanship is guaranteed for 12 months from completion. This doesn't cover damage from damp, movement in the building, impact, or decorating before the plaster has dried.

13. Waste. Unless the quote says otherwise, we'll take away our own waste. Skips for old plaster removal are extra.

14. Ownership. Materials stay ours until the invoice is paid in full.

15. Complaints. Tell us about any issue within 7 days of completion and we'll come back to put it right.`;

export const TERMS_MAX_LENGTH = 12000;

export type TermsIdentity = {
  name: string;
  address: string;
  phone: string;
};

export type TermsRun = {
  bold: boolean;
  text: string;
};

export type TermsDocument = {
  title: string;
  clauses: string[];
  footer: string;
};

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function termsFooter(identity: TermsIdentity): string {
  return [oneLine(identity.name), oneLine(identity.address), oneLine(identity.phone)].filter(Boolean).join(", ");
}

/** The wording shown when a business has not saved its own terms. */
export function defaultTermsText(identity: TermsIdentity): string {
  const name = oneLine(identity.name);
  const title = name ? `${name} – Terms and Conditions` : "Terms and Conditions";
  const footer = termsFooter(identity);
  return [title, "", TERMS_CLAUSES, ...(footer ? ["", footer] : [])].join("\n");
}

export function normaliseTerms(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

/** Blank storage uses the standard terms, with the current name, address and phone. */
export function resolveTermsText(stored: string, identity: TermsIdentity): string {
  return normaliseTerms(stored) || defaultTermsText(identity);
}

/**
 * An unchanged standard wording is stored blank, so a later letterhead edit
 * still updates the title and footer. Anything else is kept as written.
 */
export function termsToStore(submitted: string, identity: TermsIdentity): string {
  const text = normaliseTerms(submitted);
  if (!text || text === defaultTermsText(identity)) return "";
  return text;
}

export function parseTermsField(value: string): { ok: true; terms: string } | { ok: false; error: string } {
  const terms = normaliseTerms(value);
  if (terms.length > TERMS_MAX_LENGTH) {
    return { ok: false, error: "Shorten the terms to 12000 characters." };
  }
  return { ok: true, terms };
}

/** **double asterisks** become bold. A stray pair is left as typed. */
export function termsRuns(value: string): TermsRun[] {
  const parts = value.split("**");
  if (parts.length % 2 === 0) {
    const tail = parts.pop() ?? "";
    const prev = parts.pop() ?? "";
    parts.push(`${prev}**${tail}`);
  }
  return parts.flatMap((text, index) => (text ? [{ bold: index % 2 === 1, text }] : []));
}

function isClause(paragraph: string): boolean {
  return /^\d+\./.test(paragraph);
}

/** Title, numbered paragraphs, and the contact footer. Custom text keeps its blank lines. */
export function termsDocument(value: string): TermsDocument {
  const paragraphs = normaliseTerms(value)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    return { title: "Terms and conditions", clauses: [], footer: "" };
  }

  let start = 0;
  let title = "Terms and conditions";
  if (!isClause(paragraphs[0])) {
    title = paragraphs[0];
    start = 1;
  }

  let end = paragraphs.length;
  let footer = "";
  if (end - start > 1 && !isClause(paragraphs[end - 1])) {
    footer = paragraphs[end - 1];
    end -= 1;
  }

  return { title, clauses: paragraphs.slice(start, end), footer };
}
