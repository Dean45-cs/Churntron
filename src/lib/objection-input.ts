import type { ObjectionCategory } from '@prisma/client'
import { OBJECTION_CATEGORY_LABEL } from '@/lib/labels'

/**
 * Pruefung der Eingaben aus dem Wiki-Formular.
 *
 * Steht bewusst als reine Rechnung neben der Server Action: die Action schreibt,
 * diese Datei entscheidet – und laesst sich damit testen, ohne eine Datenbank
 * anzufassen.
 *
 * Der wichtigste Teil ist nicht die Laengenbegrenzung, sondern
 * `enthaeltKundendaten`. Die Wiki ist die erste Stelle im Projekt, an der
 * Freitext in die Datenbank kommt – und die Grundregel lautet: keine Klardaten.
 * Wer im Gespraech eine Formulierung mitschreibt, hat schnell die Vertragsnummer
 * danebenstehen. Genau das faengt die Pruefung ab, bevor es gespeichert wird.
 */

export const GRENZEN = {
  titel: { min: 3, max: 140 },
  antwort: { min: 15, max: 4000 },
  rueckfrage: 240,
  varianten: { anzahl: 15, laenge: 160 },
  tags: { anzahl: 10, laenge: 40 },
} as const

export type EinwandEingabe = {
  title: string
  category: ObjectionCategory
  variants: string[]
  answer: string
  followUp: string | null
  tags: string[]
}

const KATEGORIEN = Object.keys(OBJECTION_CATEGORY_LABEL) as ObjectionCategory[]

/**
 * Ziffernfolgen ab sechs Stellen und E-Mail-Adressen. Trenner wie Leerzeichen,
 * Bindestrich, Schraegstrich und Klammern werden vorher entfernt – "0431 123456",
 * "V-2026-10038" und "K-400013" sollen alle auffallen. Punkte und Kommas bleiben
 * stehen, damit ein Datum wie 01.08.2026 oder ein Preis von 1.299,00 kein
 * Fehlalarm wird.
 *
 * Sechs Stellen ist die Grenze, weil dort die Kundennummern anfangen. Was in
 * einer Einwandbehandlung sonst noch an Zahlen vorkommt – Bandbreite, Laufzeit,
 * Preis – bleibt darunter.
 */
export function enthaeltKundendaten(text: string): 'nummer' | 'email' | null {
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text)) return 'email'
  const ohneTrenner = text.replace(/[\s\-/()]/g, '')
  if (/\d{6,}/.test(ohneTrenner)) return 'nummer'
  return null
}

const DATENSCHUTZ_HINWEIS = {
  nummer:
    'Bitte keine Vertrags-, Kunden- oder Telefonnummern. Die Wiki sammelt Formulierungen, keine Fälle.',
  email: 'Bitte keine E-Mail-Adressen. Die Wiki sammelt Formulierungen, keine Fälle.',
} as const

/**
 * Zerlegt ein mehrzeiliges Feld in eine Liste. Varianten werden nur an
 * Zeilenumbruechen getrennt – in "Das ist mir zu teuer, ehrlich gesagt" steckt
 * ein Komma, das nichts trennen soll.
 */
export function zeilenListe(roh: string, grenze: { anzahl: number; laenge: number }) {
  return [
    ...new Set(
      roh
        .split('\n')
        .map((z) => z.trim())
        .filter(Boolean)
        .map((z) => z.slice(0, grenze.laenge)),
    ),
  ].slice(0, grenze.anzahl)
}

/** Schlagworte trennen zusaetzlich am Komma – sie sind einzelne Woerter. */
export function tagListe(roh: string) {
  return [
    ...new Set(
      roh
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t.slice(0, GRENZEN.tags.laenge)),
    ),
  ].slice(0, GRENZEN.tags.anzahl)
}

type Feld = 'title' | 'category' | 'answer' | 'variants' | 'tags' | 'followUp'

export type Pruefung =
  { ok: true; wert: EinwandEingabe } | { ok: false; fehler: string; feld: Feld }

/**
 * Nimmt die Rohwerte des Formulars und gibt entweder einen sauberen Eintrag
 * zurueck oder den Satz, der im Formular stehen soll.
 */
export function pruefeEinwand(roh: {
  title: string
  category: string
  variants: string
  answer: string
  followUp: string
  tags: string
}): Pruefung {
  const title = roh.title.trim().replace(/\s+/g, ' ')
  if (title.length < GRENZEN.titel.min) {
    return { ok: false, feld: 'title', fehler: 'Der Einwand braucht eine Überschrift.' }
  }
  if (title.length > GRENZEN.titel.max) {
    return {
      ok: false,
      feld: 'title',
      fehler: `Die Überschrift ist zu lang (höchstens ${GRENZEN.titel.max} Zeichen).`,
    }
  }

  if (!KATEGORIEN.includes(roh.category as ObjectionCategory)) {
    return { ok: false, feld: 'category', fehler: 'Bitte ein Thema auswählen.' }
  }

  const answer = roh.answer.trim()
  if (answer.length < GRENZEN.antwort.min) {
    return {
      ok: false,
      feld: 'answer',
      fehler: 'Die Einwandbehandlung fehlt – ein, zwei Sätze reichen für den Anfang.',
    }
  }
  if (answer.length > GRENZEN.antwort.max) {
    return {
      ok: false,
      feld: 'answer',
      fehler: `Die Einwandbehandlung ist zu lang (höchstens ${GRENZEN.antwort.max} Zeichen).`,
    }
  }

  const followUp = roh.followUp.trim().slice(0, GRENZEN.rueckfrage) || null
  const variants = zeilenListe(roh.variants, GRENZEN.varianten)
  const tags = tagListe(roh.tags)

  // Alles, was gespeichert wird, geht durch die Datenschutz-Pruefung.
  const felder: [string, Feld][] = [
    [title, 'title'],
    [answer, 'answer'],
    [variants.join(' '), 'variants'],
    [tags.join(' '), 'tags'],
    [followUp ?? '', 'followUp'],
  ]
  for (const [text, feld] of felder) {
    const fund = enthaeltKundendaten(text)
    if (fund) return { ok: false, feld, fehler: DATENSCHUTZ_HINWEIS[fund] }
  }

  return {
    ok: true,
    wert: { title, category: roh.category as ObjectionCategory, variants, answer, followUp, tags },
  }
}
