-- Wer den Text eines Wiki-Eintrags anfasst, uebernimmt ihn: ab dann laesst der
-- Seed den Starteintrag in Ruhe. Solange die Spalte false ist, darf eine
-- verbesserte Formulierung aus src/lib/objection-catalog.ts nachgezogen werden.
-- Bestehende Eintraege starten auf false – die Startbestands-Texte stammen bis
-- hierhin unveraendert aus dem Katalog.

-- AlterTable
ALTER TABLE "Objection" ADD COLUMN     "edited" BOOLEAN NOT NULL DEFAULT false;
