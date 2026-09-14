'use server'

import { revalidatePath } from 'next/cache'
import { angemeldeterNutzer } from '@/lib/session'
import { db } from '@/lib/db'
import { pruefeEinwand } from '@/lib/objection-input'

/**
 * Schreibende Vorgaenge der Einwand-Wiki.
 *
 * Wie im Provisionsmodul wird die Anmeldung in jeder Funktion selbst geprueft –
 * Server Actions sind ueber einen direkten POST erreichbar, nicht nur ueber die
 * eigene Oberflaeche.
 *
 * Anders als dort arbeitet hier jeder an denselben Zeilen: die Wiki gehoert dem
 * Team. Wer einen Eintrag verbessert, verbessert ihn fuer alle. Geloescht wird
 * trotzdem nichts – ueberholte Eintraege wandern ins Archiv.
 */

export type ActionErgebnis =
  { ok: true; hinweis?: string } | { ok: false; fehler: string; feld?: string }

const PFAD = '/dashboard/wiki'

function rohwerte(formData: FormData) {
  return {
    title: String(formData.get('title') ?? ''),
    category: String(formData.get('category') ?? ''),
    variants: String(formData.get('variants') ?? ''),
    answer: String(formData.get('answer') ?? ''),
    followUp: String(formData.get('followUp') ?? ''),
    tags: String(formData.get('tags') ?? ''),
  }
}

/** Eine neue Einwandbehandlung anlegen. */
export async function einwandAnlegen(formData: FormData): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()

  const geprueft = pruefeEinwand(rohwerte(formData))
  if (!geprueft.ok) return { ok: false, fehler: geprueft.fehler, feld: geprueft.feld }

  await db.objection.create({ data: { ...geprueft.wert, authorId: user.id } })

  revalidatePath(PFAD)
  return { ok: true, hinweis: 'Angelegt. Der Eintrag ist ab sofort in der Suche.' }
}

/**
 * Einen Eintrag ueberarbeiten. Der Schluessel aus dem Startbestand bleibt
 * unangetastet – er sagt nur, woher der Eintrag urspruenglich kam.
 *
 * `edited` wird gesetzt: ab jetzt gehoert der Text dem Team, und der Seed
 * schreibt ihn nicht mehr aus dem Katalog nach.
 */
export async function einwandAendern(id: string, formData: FormData): Promise<ActionErgebnis> {
  await angemeldeterNutzer()

  const geprueft = pruefeEinwand(rohwerte(formData))
  if (!geprueft.ok) return { ok: false, fehler: geprueft.fehler, feld: geprueft.feld }

  const { count } = await db.objection.updateMany({
    where: { id },
    data: { ...geprueft.wert, edited: true },
  })
  if (count === 0) return { ok: false, fehler: 'Eintrag nicht gefunden.' }

  revalidatePath(PFAD)
  return { ok: true, hinweis: 'Gespeichert.' }
}

/**
 * Ins Archiv legen statt loeschen: eine Formulierung, die nicht mehr passt, ist
 * trotzdem Teil der Geschichte – und morgen fehlt sonst der Grund, warum sie
 * verschwunden ist.
 */
export async function einwandArchivieren(id: string, archivieren = true): Promise<ActionErgebnis> {
  await angemeldeterNutzer()

  const { count } = await db.objection.updateMany({
    where: { id },
    data: { archived: archivieren },
  })
  if (count === 0) return { ok: false, fehler: 'Eintrag nicht gefunden.' }

  revalidatePath(PFAD)
  return { ok: true, hinweis: archivieren ? 'Ins Archiv gelegt.' : 'Wieder in der Suche.' }
}

/**
 * „Hat geholfen" – der Zaehler, der die Reihenfolge bei gleich guten Treffern
 * entscheidet. Bewusst ohne Begrenzung pro Person: gemeint ist nicht, wie viele
 * den Eintrag gut finden, sondern wie oft er im Gespraech getragen hat.
 */
export async function hatGeholfen(id: string): Promise<ActionErgebnis> {
  await angemeldeterNutzer()

  const { count } = await db.objection.updateMany({
    where: { id },
    data: { helpful: { increment: 1 } },
  })
  if (count === 0) return { ok: false, fehler: 'Eintrag nicht gefunden.' }

  revalidatePath(PFAD)
  return { ok: true }
}
