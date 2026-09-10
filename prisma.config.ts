import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * Prisma 7 nimmt die Connection-URL aus dieser Datei, nicht mehr aus dem Schema.
 *
 * Fuer Migrationen wird bewusst die DIREKTE Verbindung bevorzugt: gepoolte
 * Verbindungen (Neon/pgbouncer laufen im Transaction-Mode) koennen die
 * sitzungsweiten Advisory-Locks nicht halten, die `prisma migrate` braucht.
 * Die Vercel-Neon-Integration legt dafuer DATABASE_URL_UNPOOLED an.
 * Zur Laufzeit bleibt es beim gepoolten DATABASE_URL – siehe src/lib/db.ts.
 *
 * Die URL wird nur gesetzt, wenn eine da ist: `prisma generate` braucht keine
 * Datenbank und wuerde sonst beim `npm install` eines frischen Klons scheitern.
 * `prisma migrate` und `prisma db` melden das Fehlen weiterhin selbst.
 */
const migrationUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
})
