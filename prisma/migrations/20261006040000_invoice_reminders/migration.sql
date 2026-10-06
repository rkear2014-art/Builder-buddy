-- Overdue invoice reminders. Existing businesses start with reminders on, at 3, 7 and 14 days.

ALTER TABLE "Business"
  ADD COLUMN "remindersOn" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reminderDay1" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "reminderDay2" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "reminderDay3" INTEGER NOT NULL DEFAULT 14;

ALTER TABLE "Invoice"
  ADD COLUMN "remindersPaused" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "InvoiceReminder" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "step" INTEGER NOT NULL,
  "channel" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceReminder_invoiceId_step_key" ON "InvoiceReminder"("invoiceId", "step");
CREATE INDEX "InvoiceReminder_businessId_idx" ON "InvoiceReminder"("businessId");

ALTER TABLE "InvoiceReminder"
  ADD CONSTRAINT "InvoiceReminder_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceReminder"
  ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
