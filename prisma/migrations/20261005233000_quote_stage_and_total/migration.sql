-- Sales stage, customer total-only price, and a fixed whole-job price.
-- Existing job status values stay. Nothing is deleted.

CREATE TYPE "QuoteStage" AS ENUM ('DRAFT', 'QUOTED', 'SENT', 'WON', 'LOST');

ALTER TABLE "Business" ADD COLUMN "totalOnlyDefault" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Job" ADD COLUMN "quoteStage" "QuoteStage" NOT NULL DEFAULT 'QUOTED';
ALTER TABLE "Job" ADD COLUMN "totalOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "fixedPricePence" INTEGER;

ALTER TABLE "Invoice" ADD COLUMN "totalOnly" BOOLEAN NOT NULL DEFAULT false;

-- Booked, live and finished work, and anything already signed, is won.
UPDATE "Job" AS j
SET "quoteStage" = 'WON'
WHERE j."status" IN ('BOOKED', 'IN_PROGRESS', 'COMPLETE')
   OR EXISTS (
     SELECT 1 FROM "SignOff" AS s WHERE s."jobId" = j."id"
   );
