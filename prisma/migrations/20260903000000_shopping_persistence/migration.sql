-- CreateTable
CREATE TABLE "shopping_ingredient_checks" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "ingredientKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_ingredient_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_extras" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_extras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopping_ingredient_checks_weekStart_ingredientKey_key" ON "shopping_ingredient_checks"("weekStart", "ingredientKey");

-- CreateIndex
CREATE INDEX "shopping_ingredient_checks_weekStart_idx" ON "shopping_ingredient_checks"("weekStart");

-- CreateIndex
CREATE INDEX "shopping_extras_date_idx" ON "shopping_extras"("date");
