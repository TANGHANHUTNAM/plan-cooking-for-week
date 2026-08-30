-- DropIndex
DROP INDEX "meal_plans_userId_weekStart_key";

-- CreateTable
CREATE TABLE "meal_absences" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "meal_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_absences_mealId_userId_key" ON "meal_absences"("mealId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_weekStart_key" ON "meal_plans"("weekStart");

-- AddForeignKey
ALTER TABLE "meal_absences" ADD CONSTRAINT "meal_absences_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_absences" ADD CONSTRAINT "meal_absences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
