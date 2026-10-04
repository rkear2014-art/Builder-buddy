-- Survey ticks and a switch for the customer link live on the job.
-- A chooser tile can have its own photo, set by the business owner.
ALTER TABLE "Job"
ADD COLUMN "shareActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "surveyDone" TEXT NOT NULL DEFAULT '';

CREATE TABLE "CataloguePhoto" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "catalogueKey" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CataloguePhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CataloguePhoto_businessId_catalogueKey_key" ON "CataloguePhoto"("businessId", "catalogueKey");
CREATE INDEX "CataloguePhoto_businessId_idx" ON "CataloguePhoto"("businessId");

ALTER TABLE "CataloguePhoto" ADD CONSTRAINT "CataloguePhoto_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
