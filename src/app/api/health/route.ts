import { NextResponse } from 'next/server'

// Immer frisch beantworten – eine vorberechnete Diagnose waere wertlos.
export const dynamic = 'force-dynamic'

/**
 * Diagnose fuer das Deployment.
 *
 * Auth.js meldet jeden Konfigurationsfehler mit demselben Satz ("There was a
 * problem with the server configuration"), egal ob das Secret oder die
 * Datenbank fehlt. Diese Route sagt stattdessen, was konkret fehlt – ohne
 * Build-Logs durchzusehen.
 *
 * WICHTIG: Hier stehen ausschliesslich Ja/Nein-Angaben, niemals die Werte
 * selbst. Der Connection-String enthaelt das Datenbank-Passwort und darf
 * auch im Fehlerfall nicht nach aussen gelangen.
 *
 * Der Prisma-Client wird bewusst erst INNERHALB des try geladen: ein Import
 * am Dateikopf wuerde diese Route bei genau den Fehlern mitreissen, die sie
 * melden soll.
 */

/** Entfernt alles, was wie eine Verbindungs-URL aussieht. */
function ohneGeheimnisse(text: string) {
  return text.replace(/postgres(?:ql)?:\/\/\S+/gi, '[Verbindungsdaten entfernt]')
}

type Datenbank =
  { status: 'ok'; users: number; contracts: number } | { status: 'fehler'; meldung: string }

export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DATABASE_URL_UNPOOLED: Boolean(process.env.DATABASE_URL_UNPOOLED),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    DEMO_PASSWORD: Boolean(process.env.DEMO_PASSWORD),
    SKELETON_DEMO: process.env.SKELETON_DEMO === '1',
  }

  let datenbank: Datenbank
  if (!env.DATABASE_URL) {
    datenbank = {
      status: 'fehler',
      meldung: 'DATABASE_URL ist nicht gesetzt – die Datenbank wurde gar nicht erst gefragt.',
    }
  } else {
    try {
      const { db } = await import('@/lib/db')
      const [users, contracts] = await Promise.all([db.user.count(), db.contract.count()])
      datenbank = { status: 'ok', users, contracts }
    } catch (error) {
      datenbank = {
        status: 'fehler',
        meldung: ohneGeheimnisse(error instanceof Error ? error.message : String(error)),
      }
    }
  }

  const fehlt: string[] = []
  if (!env.DATABASE_URL)
    fehlt.push('DATABASE_URL fehlt – Datenbank im Projekt unter Storage verbinden.')
  if (!env.AUTH_SECRET)
    fehlt.push('AUTH_SECRET fehlt – Wert erzeugen und für alle Umgebungen setzen.')
  if (datenbank.status === 'fehler' && env.DATABASE_URL)
    fehlt.push('Datenbank antwortet nicht – Neon-Projekt und Verbindung prüfen.')

  const bereit = fehlt.length === 0

  return NextResponse.json(
    {
      bereit,
      hinweis: bereit
        ? 'Alles gesetzt. Scheitert der Login trotzdem, passt das Passwort nicht zum gespeicherten Hash – siehe FORCE_SEED in DEPLOY.md.'
        : 'Es fehlt etwas – siehe "fehlt". Ausführlich in DEPLOY.md unter "Wenn etwas nicht klappt".',
      fehlt,
      env,
      datenbank,
      umgebung: process.env.NODE_ENV,
    },
    { status: bereit ? 200 : 503 },
  )
}
