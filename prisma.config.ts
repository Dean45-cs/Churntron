import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

/**
 * Prisma 7 nimmt die Connection-URL aus dieser Datei, nicht mehr aus dem Schema.
 *
 * Die URL wird nur gesetzt, wenn DATABASE_URL da ist: `prisma generate` braucht
 * keine Datenbank und laeuft sonst beim `npm install` eines frischen Klons auf
 * die Nase, bevor irgendjemand eine .env anlegen konnte. `prisma migrate` und
 * `prisma db` melden weiterhin von sich aus, wenn die URL fehlt.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  ...(process.env.DATABASE_URL ? { datasource: { url: env('DATABASE_URL') } } : {}),
})
