import { quoteMoney } from "./quote";

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PART_PAID", "PAID"] as const;
export type StoredInvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  CARD: "Card",
};

export type InvoiceStanding = "Draft" | "Sent" | "Part paid" | "Paid" | "Overdue";

export function invoiceStanding(input: {
  status: StoredInvoiceStatus;
  dueDate: string;
  today: string;
  paidPence: number;
  totalDuePence: number;
}): InvoiceStanding {
  if (input.status === "PAID" || (input.totalDuePence > 0 && input.paidPence >= input.totalDuePence)) return "Paid";
  if (input.status !== "DRAFT" && input.totalDuePence <= 0) return "Paid";
  if (input.status !== "DRAFT" && input.dueDate < input.today) return "Overdue";
  if (input.paidPence > 0) return "Part paid";
  if (input.status === "DRAFT") return "Draft";
  return "Sent";
}

export function statusAfterPayment(paidPence: number, totalDuePence: number, wasDraft: boolean): StoredInvoiceStatus {
  if (totalDuePence <= 0) return wasDraft ? "DRAFT" : "PAID";
  if (paidPence >= totalDuePence) return "PAID";
  if (paidPence > 0) return "PART_PAID";
  return wasDraft ? "DRAFT" : "SENT";
}

export type InvoiceGlanceRow = {
  id: string;
  href: string;
  primary: string;
  secondary: string;
  meta: string;
};

export function invoiceGlance(input: {
  today: string;
  invoices: Array<{
    id: string;
    number: number;
    status: StoredInvoiceStatus;
    dueDate: string;
    customerName: string;
    duePence: number;
    paidPence: number;
    payments: Array<{ amountPence: number; paidOn: string }>;
  }>;
}): {
  owedPence: number;
  overdueCount: number;
  overduePence: number;
  paidThisMonthPence: number;
  owedRows: InvoiceGlanceRow[];
  overdueRows: InvoiceGlanceRow[];
} {
  const month = input.today.slice(0, 7);
  let owedPence = 0;
  let overdueCount = 0;
  let overduePence = 0;
  let paidThisMonthPence = 0;
  const owedRows: InvoiceGlanceRow[] = [];
  const overdueRows: InvoiceGlanceRow[] = [];
  for (const invoice of input.invoices) {
    for (const payment of invoice.payments) {
      if (payment.paidOn.startsWith(month)) paidThisMonthPence += payment.amountPence;
    }
    const standing = invoiceStanding({
      status: invoice.status,
      dueDate: invoice.dueDate,
      today: input.today,
      paidPence: invoice.paidPence,
      totalDuePence: invoice.duePence,
    });
    if (standing === "Draft" || standing === "Paid") continue;
    const balance = balancePence(invoice.duePence, invoice.paidPence);
    owedPence += balance;
    const row: InvoiceGlanceRow = {
      id: invoice.id,
      href: `/invoices/${invoice.id}`,
      primary: invoice.customerName,
      secondary: `INV-${String(invoice.number).padStart(4, "0")}`,
      meta: standing,
    };
    owedRows.push(row);
    if (standing === "Overdue") {
      overdueCount += 1;
      overduePence += balance;
      overdueRows.push(row);
    }
  }
  return {
    owedPence,
    overdueCount,
    overduePence,
    paidThisMonthPence,
    owedRows: owedRows.slice(0, 2),
    overdueRows: overdueRows.slice(0, 2),
  };
}

export function invoiceTotals(input: {
  lines: Array<{ quantity: string; unitPricePence: number | null }>;
  vatRegistered: boolean;
  vatRatePercent: number;
  depositPence: number | null;
}) {
  const subtotal = input.lines.reduce((sum, line) => {
    if (line.unitPricePence == null) return sum;
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty)) return sum;
    return sum + Math.round(qty * line.unitPricePence);
  }, 0);
  const money = quoteMoney({
    subtotalPence: subtotal,
    vatRegistered: input.vatRegistered,
    vatRatePercent: input.vatRatePercent,
    depositPence: input.depositPence,
  });
  const deposit = money.depositPence != null ? Math.min(money.depositPence, money.totalPence) : 0;
  return {
    subtotalPence: money.subtotalPence,
    vatPence: money.vatPence,
    totalPence: money.totalPence,
    depositPence: deposit > 0 ? deposit : null,
    duePence: Math.max(0, money.totalPence - deposit),
  };
}

export function balancePence(duePence: number, paidPence: number): number {
  return Math.max(0, duePence - paidPence);
}
