/**
 * Die beiden Ausgaben, die das Schichtende verlassen:
 *
 *   1. Reporting-CSV  – geht an PP und in die Auswertung des Chefs
 *   2. Offene (xlsx)  – die Restliste im Originalformat, geht zurueck an PP
 *
 * BEIDE SIND EINE ZUSAGE. Struktur, Spaltenfolge, Trennzeichen, Zeilenende
 * und Dateiname sind identisch mit dem alten Kampagnen-Lookup (v1.1.0).
 * Auf der Gegenseite haengen eine Power-BI-Auswertung und ein eingespielter
 * Ablauf – eine zusaetzliche Spalte ist dort kein Zugewinn, sondern ein
 * kaputter Import.
 *
 * Deshalb: Die internen Notizen aus diesem Tool tauchen hier NICHT auf.
 * Sie sind fuer die eigene Schicht gedacht, nicht fuer die Auswertung, und
 * `buildReportingZeilen` nimmt sie nicht einmal entgegen.
 * `src/lib/__tests__/lookup-export.test.ts` haelt beides fest.
 *
 * Reine Rechnung, kein DOM – deshalb in Node testbar.
 */

import { teile } from '@/lib/time'
import { recKey } from './parser'
import type { FormularStand, KampagnenTyp, LookupRecord, StatusWert } from './types'

/**
 * Die Spalten der Reporting-CSV, in genau dieser Reihenfolge.
 * Sie stehen so auch in PLAN.md unter Stage 2 – dort ist beschrieben, wie der
 * spaetere Import sie wieder einliest. Nicht umsortieren, nicht ergaenzen.
 */
export const REPORTING_SPALTEN = [
  'Kampagne',
  'Datei',
  'Kundennummer',
  'Vertrag',
  'Name',
  'Telefon',
  'Waehlnummer',
  'Status',
  'HomeID_aufgenommen',
  'Beratungsprotokoll_ausgehaendigt',
  'Bewertung_Beratung',
  'Bearbeitet_am',
] as const

/**
 * Excel und Power BI lesen eine Zelle, die mit = + - oder @ beginnt, als
 * Formel. Ein vorangestelltes Apostroph macht daraus wieder Text.
 * (CSV-/Formel-Injection – im alten Tool unter "A2 Code-Pruefung" dokumentiert.)
 */
export function neutralizeFormula(v: string): string {
  return /^[=+\-@]/.test(v) ? "'" + v : v
}

export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  s = neutralizeFormula(s)
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function kampagnenLabel(camp: KampagnenTyp): string {
  return camp === 'welcome' ? 'Welcome Call' : camp === 'courtesy' ? 'Courtesy Call' : ''
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/**
 * Zeitstempel "2026-09-14 08:05" – in deutscher Zeit, nicht in der des Rechners.
 *
 * Das alte Tool nahm die lokale Uhrzeit des Browsers. Solange in Kiel
 * gearbeitet wird, kommt dasselbe heraus; auf einem Rechner mit anderer
 * Zeitzone (oder einem Server in UTC) waere die Spalte "Bearbeitet_am" um
 * Stunden daneben. Format und Laenge bleiben unveraendert – siehe AGENTS.md,
 * Abschnitt Provisionen, Punkt 3.
 */
export function fmtTs(t: number): string {
  const z = teile(new Date(t))
  return `${z.jahr}-${pad(z.monat)}-${pad(z.tag)} ${pad(z.stunde)}:${pad(z.minute)}`
}

/** "20260914" fuer den Dateinamen – ebenfalls deutsche Zeit. */
export function datumsStempel(d: Date): string {
  const z = teile(d)
  return `${z.jahr}${pad(z.monat)}${pad(z.tag)}`
}

export type ReportingStand = {
  camp: KampagnenTyp
  statusMap: Record<string, StatusWert>
  formMap: Record<string, FormularStand>
  tsMap: Record<string, number>
}

/**
 * Welche Datensaetze ins Reporting gehen: alles, was in der Schicht angefasst
 * wurde – markiert oder im Formular ausgefuellt. Unberuehrte Zeilen bleiben
 * draussen, sonst stuende die halbe Liste als "Offen" in der Auswertung.
 */
export function reportingRelevant(r: LookupRecord, stand: ReportingStand): boolean {
  const k = recKey(r)
  const f = stand.formMap[k] || {}
  return Boolean(stand.statusMap[k] || f.homeId || f.protokoll || f.bewertung)
}

/**
 * Kopfzeile plus eine Zeile je angefasstem Datensatz.
 *
 * Nimmt bewusst KEINE Notizen entgegen: die Struktur dieser Tabelle ist die
 * Zusage an den Chef (siehe Dateikopf).
 */
export function buildReportingZeilen(records: LookupRecord[], stand: ReportingStand): string[][] {
  const campLabel = kampagnenLabel(stand.camp)
  const zeilen: string[][] = [[...REPORTING_SPALTEN]]

  records
    .filter((r) => reportingRelevant(r, stand))
    .forEach((r) => {
      const k = recKey(r)
      const f = stand.formMap[k] || {}
      const st = stand.statusMap[k] || ''
      const stTxt = st === 'done' ? 'Erledigt' : st === 'check' ? 'Prüfen' : 'Offen'
      // Home-ID fragen beide Kampagnen ab, das Beratungsprotokoll nur Welcome.
      const homeId =
        stand.camp === 'welcome' || stand.camp === 'courtesy' ? (f.homeId ? 'Ja' : 'Nein') : ''
      const prot = stand.camp === 'welcome' ? (f.protokoll ? 'Ja' : 'Nein') : ''
      const bew = stand.camp === 'welcome' && f.bewertung ? String(f.bewertung) : ''

      zeilen.push([
        campLabel,
        r._file || '',
        r.kdn || '',
        r.vertrag || '',
        r.name || '',
        r.telRaw || '',
        (r.dials && r.dials[0]) || r.dial || '',
        stTxt,
        homeId,
        prot,
        bew,
        stand.tsMap[k] ? fmtTs(stand.tsMap[k]!) : '',
      ])
    })

  return zeilen
}

/**
 * Zeilen zu CSV: BOM voran, Semikolon als Trenner, CRLF als Zeilenende.
 * Alle drei braucht Excel in der deutschen Einstellung, damit die Datei ohne
 * Import-Assistent richtig aufgeht.
 */
export function zeilenAlsCsv(zeilen: string[][]): string {
  return '﻿' + zeilen.map((row) => row.map(csvCell).join(';')).join('\r\n')
}

export function reportingDateiname(camp: KampagnenTyp, datum: Date): string {
  const campLabel = kampagnenLabel(camp)
  const basis = campLabel ? campLabel.replace(/\s+/g, '_') : 'Kampagne'
  return `${basis}_Reporting_${datumsStempel(datum)}.csv`
}

/**
 * Die Restliste: Vorspann und Kopfzeile unveraendert, danach nur die Zeilen,
 * die noch offen sind. Die Zeilennummern stammen aus `LookupRecord._aoaIdx`,
 * zeigen also auf die Originaldatei – die Restliste bleibt damit Zeile fuer
 * Zeile das, was PP geschickt hat, nur kuerzer.
 */
export function buildOffeneAoa(
  rawAoa: unknown[][],
  headerRow: number,
  behalten: ReadonlySet<number>,
): unknown[][] {
  const aoa = rawAoa.slice(0, headerRow + 1)
  for (let i = headerRow + 1; i < rawAoa.length; i++) {
    if (behalten.has(i)) aoa.push(rawAoa[i]!)
  }
  return aoa
}

export function offeneDateiname(original: string): string {
  return original.replace(/\.(xlsx|xls|csv)$/i, '') + '_offen.xlsx'
}
