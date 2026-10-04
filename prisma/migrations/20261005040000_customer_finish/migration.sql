-- Customer-facing finish: invoices, quote numbers, job photos, and trust details.

ALTER TABLE "Business"
  ADD COLUMN "invoiceDueDays" INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN "quoteValidDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "bankAccountName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "bankSortCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "bankAccountNumber" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "reviewUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "insurer" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "coverAmount" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "guarantee" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "accreditations" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Job"
  ADD COLUMN "quoteNumber" INTEGER,
  ADD COLUMN "validUntil" DATE,
  ADD COLUMN "firstViewedAt" TIMESTAMP(3),
  ADD COLUMN "lastViewedAt" TIMESTAMP(3),
  ADD COLUMN "showPhotos" BOOLEAN NOT NULL DEFAULT false;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "businessId" ORDER BY "createdAt" ASC, id ASC) AS n
  FROM "Job"
)
UPDATE "Job" AS j
SET
  "quoteNumber" = numbered.n,
  "validUntil" = ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/London')::date + 30)
FROM numbered
WHERE j.id = numbered.id;

ALTER TABLE "Job" ALTER COLUMN "quoteNumber" SET NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "validUntil" SET NOT NULL;

CREATE UNIQUE INDEX "Job_businessId_quoteNumber_key" ON "Job"("businessId", "quoteNumber");

UPDATE "Business" AS b
SET "nextQuoteNumber" = COALESCE((SELECT MAX(j."quoteNumber") FROM "Job" AS j WHERE j."businessId" = b.id), 0) + 1;

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PART_PAID', 'PAID');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD');
CREATE TYPE "PhotoStage" AS ENUM ('BEFORE', 'DURING', 'AFTER');

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issueDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "depositPence" INTEGER,
  "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
  "vatRatePercent" INTEGER NOT NULL DEFAULT 20,
  "shareToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL,
  "unit" TEXT NOT NULL,
  "unitPricePence" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amountPence" INTEGER NOT NULL,
  "paidOn" DATE NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobPhoto" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  "mime" TEXT NOT NULL,
  "stage" "PhotoStage" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_shareToken_key" ON "Invoice"("shareToken");
CREATE UNIQUE INDEX "Invoice_businessId_number_key" ON "Invoice"("businessId", "number");
CREATE INDEX "Invoice_businessId_issueDate_idx" ON "Invoice"("businessId", "issueDate");
CREATE INDEX "Invoice_jobId_idx" ON "Invoice"("jobId");
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Payment_businessId_paidOn_idx" ON "Payment"("businessId", "paidOn");
CREATE INDEX "JobPhoto_jobId_createdAt_idx" ON "JobPhoto"("jobId", "createdAt");
CREATE INDEX "JobPhoto_businessId_idx" ON "JobPhoto"("businessId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
