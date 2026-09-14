-- Duelle: 1 gegen 1 und 2 gegen 2 zwischen Kolleginnen und Kollegen.
--
-- Rein additiv – es werden nur zwei Tabellen und drei Enums angelegt, an
-- bestehenden Spalten aendert sich nichts. Der Punktestand bekommt bewusst
-- keine Spalte: er wird aus Commission, ChurnActivity und PointsEvent im
-- Zeitfenster des Duells gerechnet (siehe src/lib/duels.ts).

-- CreateEnum
CREATE TYPE "DuelMode" AS ENUM ('ONE_VS_ONE', 'TWO_VS_TWO');

-- CreateEnum
CREATE TYPE "DuelMetric" AS ENUM ('COMMISSION_CENTS', 'BOOKINGS', 'SALES', 'CHURN_SAVED', 'CALLS', 'POINTS');

-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('OPEN', 'RUNNING', 'FINISHED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "mode" "DuelMode" NOT NULL,
    "metric" "DuelMetric" NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'OPEN',
    "target" INTEGER,
    "stake" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelParticipant" (
    "id" TEXT NOT NULL,
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" INTEGER NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DuelParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Duel_status_endsAt_idx" ON "Duel"("status", "endsAt");

-- CreateIndex
CREATE INDEX "DuelParticipant_userId_idx" ON "DuelParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DuelParticipant_duelId_userId_key" ON "DuelParticipant"("duelId", "userId");

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelParticipant" ADD CONSTRAINT "DuelParticipant_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelParticipant" ADD CONSTRAINT "DuelParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
