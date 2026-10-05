-- Customer quotes can list room sizes and material quantities. On for businesses already saved.
ALTER TABLE "Business" ADD COLUMN "showQuoteRooms" BOOLEAN NOT NULL DEFAULT true;
