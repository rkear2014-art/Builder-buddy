-- CreateEnum
CREATE TYPE "BusinessRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupLock" (
    "id" INTEGER NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "SetupLock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SetupLock_singleton" CHECK ("id" = 1)
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "BusinessRole",
ADD COLUMN "businessId" TEXT;

ALTER TABLE "Job" ADD COLUMN "businessId" TEXT;
ALTER TABLE "JobMaterial" ADD COLUMN "businessId" TEXT;
ALTER TABLE "SignOff" ADD COLUMN "businessId" TEXT;
ALTER TABLE "MaterialTemplate" ADD COLUMN "businessId" TEXT;
ALTER TABLE "SavedMaterial" ADD COLUMN "businessId" TEXT;

-- Existing users each become the owner of a business named from their old business name.
INSERT INTO "Business" ("id", "name", "createdAt")
SELECT "id", "businessName", "createdAt" FROM "User";

UPDATE "User" AS u
SET "businessId" = u."id", "role" = 'OWNER';

UPDATE "Job" AS j
SET "businessId" = u."businessId"
FROM "User" AS u
WHERE j."userId" = u."id";

UPDATE "JobMaterial" AS m
SET "businessId" = j."businessId"
FROM "Job" AS j
WHERE m."jobId" = j."id";

UPDATE "SignOff" AS s
SET "businessId" = j."businessId"
FROM "Job" AS j
WHERE s."jobId" = j."id";

UPDATE "MaterialTemplate" AS t
SET "businessId" = u."businessId"
FROM "User" AS u
WHERE t."userId" = u."id";

UPDATE "SavedMaterial" AS s
SET "businessId" = u."businessId"
FROM "User" AS u
WHERE s."userId" = u."id";

ALTER TABLE "User" DROP COLUMN "businessName";

ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'MEMBER',
ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "Job" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "JobMaterial" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "SignOff" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "MaterialTemplate" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "SavedMaterial" ALTER COLUMN "businessId" SET NOT NULL;

-- An empty database stays open for the tablet setup. Any existing account closes it for good.
INSERT INTO "SetupLock" ("id", "claimed", "claimedAt")
SELECT 1,
       EXISTS (SELECT 1 FROM "User"),
       CASE WHEN EXISTS (SELECT 1 FROM "User") THEN CURRENT_TIMESTAMP ELSE NULL END;

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");
CREATE INDEX "Job_businessId_scheduledDate_idx" ON "Job"("businessId", "scheduledDate");
CREATE INDEX "JobMaterial_businessId_idx" ON "JobMaterial"("businessId");
CREATE INDEX "SignOff_businessId_idx" ON "SignOff"("businessId");
CREATE INDEX "MaterialTemplate_businessId_trade_idx" ON "MaterialTemplate"("businessId", "trade");
CREATE INDEX "SavedMaterial_businessId_trade_idx" ON "SavedMaterial"("businessId", "trade");

DROP INDEX "SavedMaterial_userId_trade_name_key";
CREATE UNIQUE INDEX "SavedMaterial_businessId_trade_name_key" ON "SavedMaterial"("businessId", "trade", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignOff" ADD CONSTRAINT "SignOff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialTemplate" ADD CONSTRAINT "MaterialTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedMaterial" ADD CONSTRAINT "SavedMaterial_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
