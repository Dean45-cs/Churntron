-- Konto und Profil: eigene Angaben, Profilbild und stille Aktualisierung.
--
-- Alle neuen Spalten sind entweder nullable oder haben einen Standardwert, die
-- Migration laeuft also auf einer gefuellten Datenbank ohne Vorarbeit durch.
-- "User"."active" steht bewusst auf true: bestehende Konten bleiben angemeldet.
--
-- Das Profilbild liegt als BYTEA in einer eigenen Tabelle. Kein Feld an "User",
-- damit die Bytes nicht bei jeder Nutzerabfrage mitgelesen werden.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "about" TEXT,
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "autoRefreshSeconds" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "UserAvatar" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
