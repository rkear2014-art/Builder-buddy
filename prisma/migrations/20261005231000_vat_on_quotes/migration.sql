-- VAT is on at 20% for new businesses. A VAT number can be printed on quotes and invoices.
-- Quotes the customer has already opened or signed, and invoices already sent or paid, keep the totals they had.
-- Draft invoices with no payment, and quotes nobody has opened, follow the business.

ALTER TABLE "Business" ADD COLUMN "vatNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Business" ALTER COLUMN "vatRegistered" SET DEFAULT true;
ALTER TABLE "Invoice" ALTER COLUMN "vatRegistered" SET DEFAULT true;

ALTER TABLE "Job" ADD COLUMN "omitVat" BOOLEAN NOT NULL DEFAULT false;

-- Keep the previous total on a quote the customer has opened or signed, when VAT was not being charged.
UPDATE "Job" AS j
SET "omitVat" = true
FROM "Business" AS b
WHERE j."businessId" = b."id"
  AND b."vatRegistered" = false
  AND (
    j."firstViewedAt" IS NOT NULL
    OR EXISTS (SELECT 1 FROM "SignOff" AS s WHERE s."jobId" = j."id")
  );

-- Draft invoices pick up VAT, except where that quote is keeping its previous total.
UPDATE "Invoice" AS i
SET "vatRegistered" = true,
    "vatRatePercent" = b."vatRatePercent"
FROM "Job" AS j, "Business" AS b
WHERE i."jobId" = j."id"
  AND j."businessId" = b."id"
  AND i."status" = 'DRAFT'
  AND i."vatRegistered" = false
  AND b."vatRegistered" = false
  AND j."omitVat" = false
  AND NOT EXISTS (SELECT 1 FROM "Payment" AS p WHERE p."invoiceId" = i."id");

-- New quotes and the remaining drafts use the business setting, which is now on.
UPDATE "Business" SET "vatRegistered" = true WHERE "vatRegistered" = false;
