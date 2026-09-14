/**
 * Wie weit ist die Schicht – und in welchem Tempo.
 *
 * „5 Treffer · 1 erledigt" sagt nichts darueber, ob die Liste bis Feierabend
 * durchgeht. Genau das ist aber die Frage, die sich gegen 16 Uhr stellt:
 * reicht die Zeit noch, oder muss der Rest morgen weiterlaufen.
 *
 * WAS ALS ARBEIT ZAEHLT: jede Beruehrung, nicht nur der Erledigt-Haken. Wer
 * anwaehlt, niemanden erreicht und „Nicht erreicht" notiert, hat diesen Kunden
 * abgearbeitet – er kostet dieselbe Zeit wie ein Gespraech und darf im Balken
 * nicht fehlen. Fuer die Auswertung bleibt er trotzdem offen, und genau
 * deshalb stehen „bearbeitet" und „erledigt" hier nebeneinander statt
 * uebereinander.
 *
 * Gerechnet wird aus dem, was ohnehin schon im Schichtstand steht – der
 * `kontaktMap` mit dem Zeitpunkt der letzten Anwahl. Es kommt also keine
 * zusaetzliche Erfassung dazu.
 *
 * Reine Rechnung, kein DOM, keine Datenbank – deshalb in Node testbar.
 * Der aktuelle Zeitpunkt wird uebergeben und nicht hier geholt: `Date.now()`
 * gehoert nicht in den Render-Pfad (AGENTS.md, Server und Client).
 */

import { tagesBeginn, tagesSchluessel, teile } from '@/lib/time'
import type { StatusWert } from './types'

const STUNDE_MS = 3_600_000

/**
 * Unterhalb dieser Schwellen ist ein Stundenschnitt Rauschen und keine
 * Aussage: drei Anrufe in den ersten fuenf Minuten haetten sonst eine
 * Hochrechnung von 36 pro Stunde zur Folge.
 */
const MIN_BEARBEITET_FUER_SCHNITT = 3
const MIN_SCHICHTDAUER_MS = 10 * 60_000

/**
 * Wie weit ein Zeitstempel vor der uebergebenen „Jetzt"-Zeit liegen darf.
 *
 * Die Oberflaeche rechnet mit der angezeigten Minute aus `uhr.ts`, und die
 * hinkt der echten Uhr bis zu 60 Sekunden hinterher. Ein Haken, der gerade
 * eben gesetzt wurde, liegt damit rechnerisch in der Zukunft – ohne diese
 * Toleranz faellt er aus dem Tempo heraus und „1 in der letzten Stunde"
 * erscheint erst eine Minute spaeter. Was deutlich darueber hinausgeht, ist
 * dagegen eine verstellte Uhr und bleibt draussen.
 */
const ZUKUNFT_TOLERANZ_MS = 2 * 60_000

/** Der Ausschnitt des Schichtstands, den die Rechnung braucht. */
export type FortschrittStand = {
  statusMap: Record<string, StatusWert>
  notizMap: Record<string, string>
  kontaktMap: Record<string, number>
}

export type Fortschritt = {
  gesamt: number
  /** Erreicht und abschliessend bearbeitet – das, was in die Auswertung geht. */
  erledigt: number
  zuPruefen: number
  /** Angewaehlt und notiert, aber ohne Haken – z. B. „Nicht erreicht". */
  nurNotiert: number
  /** Alles, was angefasst wurde. Das ist der Fortschritt der Schicht. */
  bearbeitet: number
  /** Noch gar nicht angefasst. */
  unberuehrt: number
  /** 0 bis 1, fuer den Balken. */
  anteilBearbeitet: number
  anteilErledigt: number
  /** Bearbeitete der letzten 60 Minuten. */
  letzteStunde: number
  /** Erste Anwahl des heutigen Tages, oder null. */
  schichtbeginn: number | null
  /** Heute bearbeitet. */
  seitSchichtbeginn: number
  /** Bearbeitete pro Stunde seit Schichtbeginn – null, solange zu wenig vorliegt. */
  proStunde: number | null
  /** Geschaetzte Restdauer fuer die unberuehrten, in Minuten – sonst null. */
  restMinuten: number | null
}

export function berechneFortschritt(
  keys: readonly string[],
  stand: FortschrittStand,
  jetzt: number,
): Fortschritt {
  // Der Tag beginnt in Deutschland, nicht in UTC: wer um 00:30 arbeitet,
  // soll seine Schicht nicht schon auf den Vortag gebucht sehen.
  const tagStart = tagesBeginn(new Date(jetzt)).getTime()
  const vorEinerStunde = jetzt - STUNDE_MS

  const gesamt = keys.length
  let erledigt = 0
  let zuPruefen = 0
  let nurNotiert = 0
  let letzteStunde = 0
  let seitSchichtbeginn = 0
  let schichtbeginn: number | null = null

  for (const key of keys) {
    const status = stand.statusMap[key]
    const hatNotiz = Boolean(stand.notizMap[key]?.trim())

    if (status === 'done') erledigt++
    else if (status === 'check') zuPruefen++
    else if (hatNotiz) nurNotiert++
    else continue // unberuehrt – zaehlt weder fuer den Balken noch fuers Tempo

    const ts = stand.kontaktMap[key]
    // Alles von gestern oder aus der Zukunft (verstellte Uhr) zaehlt nicht mit.
    if (ts == null || ts < tagStart || ts > jetzt + ZUKUNFT_TOLERANZ_MS) continue
    if (schichtbeginn == null || ts < schichtbeginn) schichtbeginn = ts
    seitSchichtbeginn++
    if (ts >= vorEinerStunde) letzteStunde++
  }

  const bearbeitet = erledigt + zuPruefen + nurNotiert
  const unberuehrt = gesamt - bearbeitet
  const gelaufenMs = schichtbeginn == null ? 0 : jetzt - schichtbeginn
  const genugDaten =
    schichtbeginn != null &&
    gelaufenMs >= MIN_SCHICHTDAUER_MS &&
    seitSchichtbeginn >= MIN_BEARBEITET_FUER_SCHNITT
  const proStunde = genugDaten ? (seitSchichtbeginn / gelaufenMs) * STUNDE_MS : null

  return {
    gesamt,
    erledigt,
    zuPruefen,
    nurNotiert,
    bearbeitet,
    unberuehrt,
    anteilBearbeitet: gesamt ? bearbeitet / gesamt : 0,
    anteilErledigt: gesamt ? erledigt / gesamt : 0,
    letzteStunde,
    schichtbeginn,
    seitSchichtbeginn,
    proStunde,
    // Geschaetzt wird der Weg durch die unberuehrten – die bearbeiteten sind
    // durch, auch wenn manche davon wieder auf der Restliste stehen.
    restMinuten:
      proStunde && proStunde > 0 && unberuehrt > 0
        ? Math.round((unberuehrt / proStunde) * 60)
        : null,
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

function zwei(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/**
 * Wann angewaehlt wurde, so kurz wie moeglich: „14:32" fuer heute, „gestern
 * 16:05", sonst „12.09. 09:14". Auf der Karte ist Platz fuer ein paar Zeichen,
 * nicht fuer ein volles Datum – und im Alltag geht es ohnehin fast immer um
 * heute.
 *
 * Alles in deutscher Zeit, damit auf einem Rechner in einer anderen Zeitzone
 * nicht die falsche Stunde steht.
 */
export function formatiereAnwahl(ts: number, jetzt: number): string {
  const t = teile(new Date(ts))
  const uhrzeit = `${zwei(t.stunde)}:${zwei(t.minute)}`

  const heute = tagesSchluessel(new Date(jetzt))
  const tag = tagesSchluessel(new Date(ts))
  if (tag === heute) return uhrzeit

  const gestern = tagesSchluessel(new Date(tagesBeginn(new Date(jetzt)).getTime() - STUNDE_MS))
  if (tag === gestern) return `gestern ${uhrzeit}`

  return `${zwei(t.tag)}.${zwei(t.monat)}. ${uhrzeit}`
}
