-- Provisions-Tracker: Katalog, Buchungen, Auszahlungsabgleich, Einstellungen.
--
-- Die neuen Pflichtspalten in "CommissionRule" werden erst nullable angelegt,
-- gefuellt und dann festgezogen. So laeuft die Migration auch auf einer
-- Datenbank durch, in der schon Platzhalter-Regeln aus Stage 1 stehen; die
-- bleiben als "legacy-..." erhalten, werden aber inaktiv gestellt, damit sie
-- nicht neben dem echten Katalog im Tracker auftauchen.

-- CreateEnum
CREATE TYPE "CommissionCategory" AS ENUM ('SALE_PRIVATE', 'SALE_BUSINESS', 'ADDON', 'TARIFF_CHANGE', 'CAMPAIGN');

-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_contractId_fkey";

-- AlterTable: Buchungen brauchen keinen Vertrag mehr, aber einen Vorgangszeitpunkt.
ALTER TABLE "Commission" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "contractId" DROP NOT NULL;

-- Bestehende Positionen: der Vorgang lag zum Anlagezeitpunkt, nicht heute.
UPDATE "Commission" SET "occurredAt" = "createdAt";

-- AlterTable: Katalogfelder
ALTER TABLE "CommissionRule" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" "CommissionCategory",
ADD COLUMN     "hint" TEXT,
ADD COLUMN     "key" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "variant" TEXT;

UPDATE "CommissionRule"
SET "key" = 'legacy-' || "id",
    "category" = 'CAMPAIGN',
    "active" = false,
    "hint" = 'Platzhalter aus Stage 1 – durch den Katalog abgeloest.'
WHERE "key" IS NULL;

ALTER TABLE "CommissionRule" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "CommissionRule" ALTER COLUMN "category" SET NOT NULL;

-- CreateTable
CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "paidCents" INTEGER NOT NULL,
    "paidOn" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "weeklyHours" DECIMAL(4,1) NOT NULL DEFAULT 40,
    "workDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "baseSalaryCents" INTEGER NOT NULL DEFAULT 0,
    "taxClass" INTEGER NOT NULL DEFAULT 1,
    "churchTaxPercent" INTEGER NOT NULL DEFAULT 0,
    "childAllowances" DECIMAL(3,1) NOT NULL DEFAULT 0,
    "children" INTEGER NOT NULL DEFAULT 0,
    "healthExtraRateBp" INTEGER NOT NULL DEFAULT 290,
    "taxYear" INTEGER NOT NULL DEFAULT 2026,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayout_userId_periodKey_key" ON "CommissionPayout"("userId", "periodKey");

-- CreateIndex
CREATE INDEX "Commission_userId_occurredAt_idx" ON "Commission"("userId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_key_key" ON "CommissionRule"("key");

-- CreateIndex
CREATE INDEX "CommissionRule_category_sortOrder_idx" ON "CommissionRule"("category", "sortOrder");

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
