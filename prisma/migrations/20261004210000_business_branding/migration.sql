-- Optional letterhead and logo for each business. Existing rows stay blank.
ALTER TABLE "Business"
ADD COLUMN "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN "website" TEXT NOT NULL DEFAULT '',
ADD COLUMN "tagline" TEXT NOT NULL DEFAULT '',
ADD COLUMN "logoBytes" BYTEA,
ADD COLUMN "logoMime" TEXT,
ADD COLUMN "logoUpdatedAt" TIMESTAMP(3);
