/**
 * Wie weit ist die Schicht – und in welchem Tempo.
 *
 * „5 Treffer · 1 erledigt" sagt nichts darueber, ob die Liste bis Feierabend
 * durchgeht. Genau das ist aber die Frage, die sich gegen 16 Uhr stellt:
 * reicht die Zeit noch, oder muss der Rest morgen weiterlaufen.
 *
 * Gerechnet wird aus dem, was ohnehin schon im Schichtstand steht – der
 * `tsMap` mit dem Zeitpunkt der letzten Aenderung je Datensatz. Es kommt
 * also keine zusaetzliche Erfassung dazu.
 *
 * Reine Rechnung, kein DOM, keine Datenbank – deshalb in Node testbar.
 * Der aktuelle Zeitpunkt wird uebergeben und nicht hier geholt: `Date.now()`
 * gehoert nicht in den Render-Pfad (AGENTS.md, Server und Client).
 */

import { tagesBeginn } from '@/lib/time'
import type { StatusWert } from './types'

const STUNDE_MS = 3_600_000

/**
 * Unterhalb dieser Schwellen ist ein Stundenschnitt Rauschen und keine
 * Aussage: drei Anrufe in den ersten fuenf Minuten haetten sonst eine
 * Hochrechnung von 36 pro Stunde zur Folge.
 */
const MIN_ERLEDIGT_FUER_SCHNITT = 3
const MIN_SCHICHTDAUER_MS = 10 * 60_000

export type Fortschritt = {
  gesamt: number
  erledigt: number
  zuPruefen: number
  /** Noch gar nicht angefasst. */
  unberuehrt: number
  /** Alles, was noch zu tun ist – die zu Pruefenden zaehlen dazu. */
  offen: number
  /** 0 bis 1, fuer den Balken. */
  anteilErledigt: number
  /** Erledigte der letzten 60 Minuten. */
  letzteStunde: number
  /** Erste Markierung des heutigen Tages, oder null. */
  schichtbeginn: number | null
  /** Heute erledigt. */
  seitSchichtbeginn: number
  /** Erledigte pro Stunde seit Schichtbeginn – null, solange zu wenig vorliegt. */
  proStunde: number | null
  /** Geschaetzte Restdauer in Minuten – null, wenn nicht seriös schaetzbar. */
  restMinuten: number | null
}

export function berechneFortschritt(
  keys: readonly string[],
  statusMap: Record<string, StatusWert>,
  tsMap: Record<string, number>,
  jetzt: number,
): Fortschritt {
  // Der Tag beginnt in Deutschland, nicht in UTC: wer um 00:30 arbeitet,
  // soll seine Schicht nicht schon auf den Vortag gebucht sehen.
  const tagStart = tagesBeginn(new Date(jetzt)).getTime()
  const vorEinerStunde = jetzt - STUNDE_MS

  const gesamt = keys.length
  let erledigt = 0
  let zuPruefen = 0
  let letzteStunde = 0
  let seitSchichtbeginn = 0
  let schichtbeginn: number | null = null

  for (const key of keys) {
    const status = statusMap[key]
    if (status === 'done') erledigt++
    else if (status === 'check') zuPruefen++

    const ts = tsMap[key]
    // Alles von gestern oder aus der Zukunft (verstellte Uhr) zaehlt nicht mit.
    if (ts == null || ts < tagStart || ts > jetzt) continue
    if (schichtbeginn == null || ts < schichtbeginn) schichtbeginn = ts
    if (status === 'done') {
      seitSchichtbeginn++
      if (ts >= vorEinerStunde) letzteStunde++
    }
  }

  const offen = gesamt - erledigt
  const gelaufenMs = schichtbeginn == null ? 0 : jetzt - schichtbeginn
  const genugDaten =
    schichtbeginn != null &&
    gelaufenMs >= MIN_SCHICHTDAUER_MS &&
    seitSchichtbeginn >= MIN_ERLEDIGT_FUER_SCHNITT
  const proStunde = genugDaten ? (seitSchichtbeginn / gelaufenMs) * STUNDE_MS : null

  return {
    gesamt,
    erledigt,
    zuPruefen,
    unberuehrt: gesamt - erledigt - zuPruefen,
    offen,
    anteilErledigt: gesamt ? erledigt / gesamt : 0,
    letzteStunde,
    schichtbeginn,
    seitSchichtbeginn,
    proStunde,
    restMinuten:
      proStunde && proStunde > 0 && offen > 0 ? Math.round((offen / proStunde) * 60) : null,
  }
}

/**
 * Dauer fuers Auge: „45 min", „1 h 25 min", „3 h".
 * Ab einem Arbeitstag wird nicht mehr genauer geworden – „12 h 40 min" als
 * Restzeit sagt ohnehin nur noch „heute nicht mehr".
 */
export function formatiereDauer(minuten: number): string {
  const m = Math.max(0, Math.round(minuten))
  if (m < 60) return `${m} min`
  const stunden = Math.floor(m / 60)
  const rest = m % 60
  if (stunden >= 10) return `${stunden} h`
  return rest ? `${stunden} h ${rest} min` : `${stunden} h`
}
