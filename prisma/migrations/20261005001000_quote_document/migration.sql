-- Quotation wording and VAT sit on the business. Deposit and line prices sit on the job.
ALTER TABLE "Business"
ADD COLUMN "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "vatRatePercent" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN "quoteLetter" TEXT NOT NULL DEFAULT '',
ADD COLUMN "quoteChips" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Job"
ADD COLUMN "showLinePrices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "depositPence" INTEGER;
