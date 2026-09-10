import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * Prisma 7 verbindet ueber einen Driver-Adapter statt ueber die URL im Schema.
 *
 * Bewusst OHNE Ausnahme beim Laden des Moduls, auch wenn DATABASE_URL fehlt:
 * ein Fehler hier legt jeden Import lahm, der db anfasst – auch den von
 * /api/health, also ausgerechnet die Stelle, die das Problem melden soll.
 * Ausserdem bricht `next build` dann schon beim Einsammeln der Routen ab.
 * Fehlt die Variable, scheitert stattdessen die erste Abfrage – und
 * /api/health benennt die fehlende Variable ausdruecklich.
 */
const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  })

// Im Dev-Modus wird das Modul bei jedem Hot-Reload neu ausgewertet – ohne diesen
// Cache liefe die Verbindungszahl davon.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
