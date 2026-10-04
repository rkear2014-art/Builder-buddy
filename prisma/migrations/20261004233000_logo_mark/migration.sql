-- Compact mark stored beside the letterhead logo.
ALTER TABLE "Business"
ADD COLUMN "markBytes" BYTEA,
ADD COLUMN "markMime" TEXT,
ADD COLUMN "markUpdatedAt" TIMESTAMP(3);
