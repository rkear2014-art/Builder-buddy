-- Crew on a job. Existing accents, materials, and labour-per-m² prices are left as they are.

CREATE TABLE "CrewRate" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "basis" TEXT NOT NULL DEFAULT 'day',
  "ratePence" INTEGER,
  CONSTRAINT "CrewRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrewRate_businessId_role_key" ON "CrewRate"("businessId", "role");
CREATE INDEX "CrewRate_businessId_idx" ON "CrewRate"("businessId");

CREATE TABLE "JobCrew" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "basis" TEXT NOT NULL DEFAULT 'day',
  "ratePence" INTEGER,
  CONSTRAINT "JobCrew_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobCrew_jobId_role_key" ON "JobCrew"("jobId", "role");
CREATE INDEX "JobCrew_businessId_idx" ON "JobCrew"("businessId");
CREATE INDEX "JobCrew_jobId_idx" ON "JobCrew"("jobId");

ALTER TABLE "CrewRate" ADD CONSTRAINT "CrewRate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobCrew" ADD CONSTRAINT "JobCrew_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobCrew" ADD CONSTRAINT "JobCrew_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
