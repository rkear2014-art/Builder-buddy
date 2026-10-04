-- Several dashboard photos per business. A photo already stored on the business is kept.
CREATE TABLE "HeroPhoto" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "sourceKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroPhoto_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HeroPhoto" ("id", "businessId", "bytes", "mime", "caption", "sourceKey", "sortOrder", "createdAt", "updatedAt")
SELECT
    'legacy-' || "id",
    "id",
    "heroBytes",
    "heroMime",
    '',
    'legacy-' || "id",
    0,
    COALESCE("heroUpdatedAt", CURRENT_TIMESTAMP),
    COALESCE("heroUpdatedAt", CURRENT_TIMESTAMP)
FROM "Business"
WHERE "heroBytes" IS NOT NULL AND "heroMime" IS NOT NULL;

CREATE UNIQUE INDEX "HeroPhoto_businessId_sourceKey_key" ON "HeroPhoto"("businessId", "sourceKey");
CREATE INDEX "HeroPhoto_businessId_sortOrder_idx" ON "HeroPhoto"("businessId", "sortOrder");

ALTER TABLE "HeroPhoto" ADD CONSTRAINT "HeroPhoto_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Business" DROP COLUMN "heroBytes",
DROP COLUMN "heroMime",
DROP COLUMN "heroUpdatedAt";
