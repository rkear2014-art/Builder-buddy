-- Terms printed at the bottom of a customer quote. Blank uses the standard wording.
-- A signature stores that the customer agreed, the wording they saw, and when.

ALTER TABLE "Business" ADD COLUMN "terms" TEXT NOT NULL DEFAULT '';

ALTER TABLE "SignOff" ADD COLUMN "termsAgreed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SignOff" ADD COLUMN "termsText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SignOff" ADD COLUMN "termsAgreedAt" TIMESTAMP(3);
