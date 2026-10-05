-- AK website red, remembered measure choices, and a structured site address.
-- Existing jobs keep their address text, materials, and any accent that is not the old steel blue.

UPDATE "Business" SET "accent" = '#dd1f29' WHERE lower("accent") = '#395571';

ALTER TABLE "Job" ADD COLUMN "measureSelection" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "postcode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "addressLine1" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "addressLine2" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "town" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "county" TEXT NOT NULL DEFAULT '';

ALTER TABLE "RoomMeasure" ADD COLUMN "externalCorners" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RoomMeasure" ADD COLUMN "stopBeadM" DECIMAL(8,2) NOT NULL DEFAULT 0;
