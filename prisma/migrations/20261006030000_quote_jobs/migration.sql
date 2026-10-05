-- More than one job on the same quote. Existing quotes become a single section.

CREATE TABLE "JobSection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "typeKey" TEXT NOT NULL DEFAULT '',
    "fixedPricePence" INTEGER,
    "dayCount" DECIMAL(6,2),
    "measureSelection" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "JobSection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobSection_businessId_idx" ON "JobSection"("businessId");
CREATE INDEX "JobSection_jobId_sortOrder_idx" ON "JobSection"("jobId", "sortOrder");

INSERT INTO "JobSection" ("id", "businessId", "jobId", "sortOrder", "title", "typeKey", "dayCount", "measureSelection")
SELECT
    'sec_' || "id",
    "businessId",
    "id",
    0,
    CASE
        WHEN btrim("measureTypeName") <> '' THEN left(btrim("measureTypeName"), 80)
        WHEN btrim("description") <> '' THEN left(regexp_replace(btrim("description"), E'[\\n\\r].*', ''), 80)
        ELSE 'Plastering'
    END,
    "measureTypeKey",
    "dayCount",
    "measureSelection"
FROM "Job";

ALTER TABLE "JobSection" ADD CONSTRAINT "JobSection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobSection" ADD CONSTRAINT "JobSection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobMaterial" ADD COLUMN "sectionId" TEXT;
UPDATE "JobMaterial" SET "sectionId" = 'sec_' || "jobId";
ALTER TABLE "JobMaterial" ALTER COLUMN "sectionId" SET NOT NULL;
CREATE INDEX "JobMaterial_sectionId_idx" ON "JobMaterial"("sectionId");
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "JobSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomMeasure" ADD COLUMN "sectionId" TEXT;
UPDATE "RoomMeasure" SET "sectionId" = 'sec_' || "jobId";
ALTER TABLE "RoomMeasure" ALTER COLUMN "sectionId" SET NOT NULL;
CREATE INDEX "RoomMeasure_sectionId_idx" ON "RoomMeasure"("sectionId");
ALTER TABLE "RoomMeasure" ADD CONSTRAINT "RoomMeasure_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "JobSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobCrew" ADD COLUMN "sectionId" TEXT;
UPDATE "JobCrew" SET "sectionId" = 'sec_' || "jobId";
ALTER TABLE "JobCrew" ALTER COLUMN "sectionId" SET NOT NULL;
DROP INDEX "JobCrew_jobId_role_key";
CREATE UNIQUE INDEX "JobCrew_sectionId_role_key" ON "JobCrew"("sectionId", "role");
CREATE INDEX "JobCrew_sectionId_idx" ON "JobCrew"("sectionId");
ALTER TABLE "JobCrew" ADD CONSTRAINT "JobCrew_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "JobSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
