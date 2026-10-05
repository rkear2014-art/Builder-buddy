-- Room sizes, coverage and labour. Existing jobs and materials are left as they are.

ALTER TABLE "Business" ADD COLUMN "wastagePercent" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "Job" ADD COLUMN "wastagePercent" INTEGER;
ALTER TABLE "Job" ADD COLUMN "measureTypeKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "measureTypeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "dayRatePence" INTEGER;
ALTER TABLE "Job" ADD COLUMN "dayCount" DECIMAL(6,2);

ALTER TABLE "JobMaterial" ADD COLUMN "fromMeasure" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MaterialTemplateItem" ADD COLUMN "coverageBasis" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MaterialTemplateItem" ADD COLUMN "coverageAmount" DECIMAL(10,2);

ALTER TABLE "SavedMaterial" ADD COLUMN "coverageBasis" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SavedMaterial" ADD COLUMN "coverageAmount" DECIMAL(10,2);

CREATE TABLE "LabourRate" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "jobTypeKey" TEXT NOT NULL,
  "labourPerM2Pence" INTEGER,
  CONSTRAINT "LabourRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomMeasure" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "lengthM" DECIMAL(8,2),
  "widthM" DECIMAL(8,2),
  "heightM" DECIMAL(8,2),
  "includeWalls" BOOLEAN NOT NULL DEFAULT true,
  "includeCeiling" BOOLEAN NOT NULL DEFAULT false,
  "directAreaM2" DECIMAL(10,2),
  "doorCount" INTEGER NOT NULL DEFAULT 0,
  "doorAreaM2" DECIMAL(6,2) NOT NULL DEFAULT 1.9,
  "windowCount" INTEGER NOT NULL DEFAULT 0,
  "windowAreaM2" DECIMAL(6,2) NOT NULL DEFAULT 1.5,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "RoomMeasure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabourRate_businessId_jobTypeKey_key" ON "LabourRate"("businessId", "jobTypeKey");
CREATE INDEX "LabourRate_businessId_idx" ON "LabourRate"("businessId");
CREATE INDEX "RoomMeasure_jobId_idx" ON "RoomMeasure"("jobId");
CREATE INDEX "RoomMeasure_businessId_idx" ON "RoomMeasure"("businessId");

ALTER TABLE "LabourRate" ADD CONSTRAINT "LabourRate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomMeasure" ADD CONSTRAINT "RoomMeasure_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomMeasure" ADD CONSTRAINT "RoomMeasure_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
