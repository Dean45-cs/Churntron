-- Einwand-Wiki: gesammelte Einwandbehandlungen fuer das Gespraech.
--
-- Eine einzelne Tabelle, absichtlich ohne Bezug zu Contract: hier steht, WAS
-- Kundinnen und Kunden sagen, nie wer es gesagt hat. "key" traegt den
-- Startbestand aus src/lib/objection-catalog.ts und ist bei selbst angelegten
-- Eintraegen NULL – deshalb nullable und trotzdem eindeutig.

-- CreateEnum
CREATE TYPE "ObjectionCategory" AS ENUM ('PRICE', 'COMPETITOR', 'TECHNICAL', 'CONSTRUCTION', 'SERVICE', 'TIMING', 'NEED', 'DECISION', 'CONTRACT', 'TRUST', 'OTHER');

-- CreateTable
CREATE TABLE "Objection" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "title" TEXT NOT NULL,
    "category" "ObjectionCategory" NOT NULL,
    "variants" TEXT[],
    "answer" TEXT NOT NULL,
    "followUp" TEXT,
    "tags" TEXT[],
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Objection_key_key" ON "Objection"("key");

-- CreateIndex
CREATE INDEX "Objection_archived_category_idx" ON "Objection"("archived", "category");

-- AddForeignKey
ALTER TABLE "Objection" ADD CONSTRAINT "Objection_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
