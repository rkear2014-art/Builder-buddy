-- Diary booking type, how many days it runs, and jobs won but not yet given a day.
ALTER TABLE "Job" ADD COLUMN "bookingKind" TEXT NOT NULL DEFAULT 'job';
ALTER TABLE "Job" ADD COLUMN "spanDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Job" ADD COLUMN "onDiary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Job" ADD COLUMN "assignedName" TEXT NOT NULL DEFAULT '';
