-- Daily count of AI photo measures. The photos are not stored.

CREATE TABLE "PhotoMeasureDay" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PhotoMeasureDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhotoMeasureDay_businessId_day_key" ON "PhotoMeasureDay"("businessId", "day");
CREATE INDEX "PhotoMeasureDay_businessId_idx" ON "PhotoMeasureDay"("businessId");

ALTER TABLE "PhotoMeasureDay"
  ADD CONSTRAINT "PhotoMeasureDay_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
