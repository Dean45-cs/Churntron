/**
 * In welcher Reihenfolge die Liste abgearbeitet wird.
 *
 * Die Datei kommt in der Reihenfolge von PP, und die sagt nichts darueber, wen
 * man als Naechstes anrufen sollte. Wer stur von oben nach unten geht, ruft den
 * Rueckruf um 18 Uhr nicht an, versucht es bei der Mailbox von vor zehn Minuten
 * gleich nochmal und sucht den Zwilling einer Dublette sechzig Zeilen weiter
 * unten.
 *
 * Die Einstufung haengt an dem, was ohnehin entsteht: Status, Notiz-Bausteine
 * und der Zeitpunkt der letzten Anwahl. Keine zusaetzliche Erfassung.
 *
 * WICHTIG: Sie liest die **Bausteine**, nicht den Freitext. Wer „nicht erreicht"
 * selbst tippt, statt den Baustein anzutippen, landet unter „gesprochen". Aus
 * Freitext zu raten waere die schlechtere Wette – „nicht zufrieden" enthaelt
 * „zufrieden", und eine Einordnung, die man nicht vorhersagen kann, ist
 * schlimmer als gar keine.
 *
 * Reine Rechnung, kein DOM, keine Datenbank – deshalb in Node testbar.
 */

import { bausteinAktiv } from './storage'
import type { Dublette } from './dubletten'
import type { LookupRecord, StatusWert } from './types'

/**
 * Wie lange nach einem erfolglosen Versuch gewartet wird, bevor der Eintrag
 * wieder nach oben rutscht. Eine Zahl, kein Naturgesetz: wenn sich im Alltag
 * zeigt, dass zwei Stunden besser passen, ist es diese eine Zeile.
 */
export const WARTEZEIT_MINUTEN = 90

const MINUTE_MS = 60_000

export type Stufe =
  | 'rueckruf'
  | 'geflaggt'
  | 'zweiterVersuch'
  | 'unberuehrt'
  | 'zuFrisch'
  | 'gesprochen'
  | 'ohneNummer'
  | 'aussichtslos'
  | 'erledigt'

/**
 * Die Stufen liegen 100 auseinander. Innerhalb einer Stufe bleibt damit Platz
 * fuer eine Feinsortierung, ohne dass eine Stufe in die naechste rutscht.
 */
const PUNKTE: Record<Stufe, number> = {
  /** Ein zugesagter Rueckruf ist ein Versprechen – der geht vor. */
  rueckruf: 800,
  /** „Noch zu pruefen" hat jemand bewusst gesetzt, um zurueckzukommen. */
  geflaggt: 700,
  /** Erfolglos versucht, Wartezeit um – jetzt lohnt der zweite Anlauf. */
  zweiterVersuch: 600,
  /** Der Normalfall: noch nie angefasst. */
  unberuehrt: 500,
  /** Gerade erst versucht – gleich nochmal waere sinnlos. */
  zuFrisch: 400,
  /** Da war jemand dran. Kein Grund, nochmal anzurufen. */
  gesprochen: 300,
  /** Ohne Rufnummer laesst sich nichts waehlen – bleibt trotzdem offen. */
  ohneNummer: 200,
  /** „Kein Interesse", „Falsche Nummer" – ein Nein ist ein Nein. */
  aussichtslos: 100,
  /** Durch. */
  erledigt: 0,
}

export const STUFEN_TEXT: Record<Stufe, string> = {
  rueckruf: 'Rückruf zugesagt',
  geflaggt: 'zu prüfen',
  zweiterVersuch: 'zweiter Versuch',
  unberuehrt: 'offen',
  zuFrisch: 'gerade erst versucht',
  gesprochen: 'gesprochen',
  ohneNummer: 'keine Nummer',
  aussichtslos: 'kein Interesse',
  erledigt: 'erledigt',
}

export type SortStand = {
  statusMap: Record<string, StatusWert>
  notizMap: Record<string, string>
  kontaktMap: Record<string, number>
}

export type Einstufung = {
  stufe: Stufe
  punkte: number
}

/**
 * Wohin ein einzelner Datensatz gehoert. Die Reihenfolge der Abfragen ist die
 * Rangfolge der Gruende: ein zugesagter Rueckruf schlaegt alles, ein Haken
 * beendet alles.
 */
export function ordneEin(
  r: LookupRecord,
  key: string,
  stand: SortStand,
  jetzt: number,
): Einstufung {
  const stufe = (s: Stufe, bonus = 0): Einstufung => ({ stufe: s, punkte: PUNKTE[s] + bonus })

  if (stand.statusMap[key] === 'done') return stufe('erledigt')

  const notiz = stand.notizMap[key] ?? ''
  const hat = (baustein: string) => bausteinAktiv(notiz, baustein)

  if (hat('Rückruf vereinbart') || hat('Wiedervorlage')) return stufe('rueckruf')
  if (stand.statusMap[key] === 'check') return stufe('geflaggt')
  if (hat('Kein Interesse') || hat('Falsche Nummer')) return stufe('aussichtslos')
  if (!r.dials.length) return stufe('ohneNummer')

  if (hat('Nicht erreicht') || hat('Mailbox')) {
    const kontakt = stand.kontaktMap[key]
    // Ohne Zeitstempel laesst sich die Wartezeit nicht beurteilen – dann gilt
    // der Versuch als lange genug her.
    const wartetMinuten = kontakt == null ? Infinity : (jetzt - kontakt) / MINUTE_MS
    if (wartetMinuten < WARTEZEIT_MINUTEN) return stufe('zuFrisch')
    // Wer am laengsten wartet, kommt zuerst – der Bonus bleibt unter 100 und
    // traegt den Eintrag deshalb nie in die naechste Stufe.
    const bonus = Number.isFinite(wartetMinuten) ? Math.min(99, wartetMinuten / 10) : 99
    return stufe('zweiterVersuch', bonus)
  }

  if (notiz.trim()) return stufe('gesprochen')
  return stufe('unberuehrt')
}

/**
 * Die Reihenfolge als Liste von Indizes, beste zuerst.
 *
 * Dubletten reisen als Gruppe: sonst steht der Zwilling sechzig Zeilen weiter
 * unten und man waehlt zweimal. Die Gruppe steht dort, wo ihr dringendstes
 * Mitglied stuende.
 */
export function berechneReihenfolge(
  records: readonly LookupRecord[],
  keys: readonly string[],
  stand: SortStand,
  dubletten: ReadonlyMap<number, Dublette>,
  jetzt: number,
): number[] {
  const n = records.length
  const punkte = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    punkte[i] = ordneEin(records[i]!, keys[i]!, stand, jetzt).punkte
  }

  // Jede Gruppe wird ueber den kleinsten Index ihrer Mitglieder benannt.
  const gruppe = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    let kleinster = i
    const d = dubletten.get(i)
    if (d) for (const p of d.partner) if (p < kleinster) kleinster = p
    gruppe[i] = kleinster
  }

  const gruppenPunkte = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const g = gruppe[i]!
    const bisher = gruppenPunkte.get(g)
    if (bisher == null || punkte[i]! > bisher) gruppenPunkte.set(g, punkte[i]!)
  }

  const reihe = Array.from({ length: n }, (_, i) => i)
  reihe.sort((a, b) => {
    const ga = gruppenPunkte.get(gruppe[a]!)!
    const gb = gruppenPunkte.get(gruppe[b]!)!
    if (ga !== gb) return gb - ga
    // Gleich dringende Gruppen: die aus der Datei fruehere zuerst.
    if (gruppe[a] !== gruppe[b]) return gruppe[a]! - gruppe[b]!
    // Innerhalb einer Gruppe das dringendste Mitglied nach oben.
    if (punkte[a] !== punkte[b]) return punkte[b]! - punkte[a]!
    return a - b
  })
  return reihe
}

/**
 * Aus der Reihenfolge den Platz je Datensatz – damit sich eine gefilterte
 * Teilmenge in derselben Ordnung sortieren laesst, ohne erneut zu rechnen.
 */
export function plaetze(reihenfolge: readonly number[], anzahl: number): number[] {
  const platz = new Array<number>(anzahl).fill(anzahl)
  reihenfolge.forEach((idx, pos) => {
    if (idx < anzahl) platz[idx] = pos
  })
  return platz
}
