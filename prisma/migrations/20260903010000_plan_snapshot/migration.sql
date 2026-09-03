-- CreateEnum
CREATE TYPE "PlanSnapshotReason" AS ENUM ('RANDOM_WEEK', 'COPY_LAST_WEEK', 'RESTORE');

-- CreateTable
CREATE TABLE "plan_snapshots" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "reason" "PlanSnapshotReason" NOT NULL,
    "mealCount" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_snapshots_weekStart_createdAt_idx" ON "plan_snapshots"("weekStart", "createdAt");
