-- Accent colour and optional hero photo for the desk dashboard.
ALTER TABLE "Business"
ADD COLUMN "accent" TEXT NOT NULL DEFAULT '',
ADD COLUMN "heroBytes" BYTEA,
ADD COLUMN "heroMime" TEXT,
ADD COLUMN "heroUpdatedAt" TIMESTAMP(3);
