-- DropForeignKey
ALTER TABLE "meal_plans" DROP CONSTRAINT "meal_plans_userId_fkey";

-- AlterTable
ALTER TABLE "meal_plans" DROP COLUMN "userId";
