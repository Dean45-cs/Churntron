/**
 * Bruecke zur mitgelieferten SheetJS-Build: Excel rein, Excel raus.
 *
 * Die Bibliothek wiegt knapp ein Megabyte und wird erst gebraucht, wenn
 * wirklich eine Datei ins Feld gezogen wird. Deshalb laedt sie ueber einen
 * dynamischen Import nach und liegt nicht im Bundle der Seite.
 *
 * Warum die Datei im Repo liegt und nicht aus npm kommt, steht in
 * `src/vendor/sheetjs/README.md`. Wenn die Abhaengigkeit spaeter aus der
 * SheetJS-Registry kommt, ist hier genau eine Zeile zu aendern.
 */

import type { ColInfo } from '@/vendor/sheetjs/xlsx.min.js'
import { buildOffeneAoa, offeneDateiname } from './export'
import { buildRecords } from './parser'
import type { LookupRecord } from './types'

type XlsxApi = typeof import('@/vendor/sheetjs/xlsx.min.js')

let geladen: Promise<XlsxApi> | null = null

/** Laedt SheetJS einmal und merkt sich das Ergebnis. */
export function ladeXlsx(): Promise<XlsxApi> {
  geladen ??= import('@/vendor/sheetjs/xlsx.min.js').then((mod) => {
    // Die Build ist UMD: der Bundler reicht sie als CommonJS-Default durch.
    const m = mod as XlsxApi & { default?: XlsxApi }
    return m.default ?? m
  })
  return geladen
}

/**
 * Was von einer eingelesenen Datei aufgehoben werden muss, um am Schichtende
 * die Restliste im Originalformat zu schreiben: die Rohzeilen, die Kopfzeile,
 * die Spaltenbreiten und der Name des Blattes.
 */
export type DateiMeta = {
  rawAoa: unknown[][]
  headerRow: number
  cols: ColInfo[] | null
  sheet: string
}

export type GeleseneDatei = {
  records: LookupRecord[]
  meta: DateiMeta
}

/**
 * Liest eine Datei ein – wie im alten Tool:
 *
 * - Es zaehlt das Blatt mit den meisten Zeilen, nicht das erste. Die Listen
 *   von PP haben regelmaessig ein Deckblatt davor.
 * - Geparst wird die Textfassung (`raw:false`), damit Kundennummern mit
 *   fuehrender Null und als Datum formatierte Zellen so ankommen, wie sie
 *   in Excel aussehen.
 * - Fuer den Export wird zusaetzlich die Rohfassung (`raw:true`) behalten:
 *   Die Restliste soll die Originalwerte tragen, nicht die Anzeigetexte.
 */
export async function leseDatei(file: File): Promise<GeleseneDatei> {
  const XLSX = await ladeXlsx()
  const puffer = await file.arrayBuffer()
  const wb = XLSX.read(new Uint8Array(puffer), { type: 'array', cellDates: true })

  let bestName = wb.SheetNames[0] ?? ''
  let bestN = -1
  let bestText: unknown[][] = []
  wb.SheetNames.forEach((n) => {
    const blatt = wb.Sheets[n]
    if (!blatt) return
    const aoa = XLSX.utils.sheet_to_json(blatt, { header: 1, raw: false, defval: '' })
    if (aoa.length > bestN) {
      bestN = aoa.length
      bestName = n
      bestText = aoa
    }
  })

  const ws = wb.Sheets[bestName]
  if (!ws) throw new Error('Die Datei enthält kein lesbares Tabellenblatt.')
  const rawAoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
  const out = buildRecords(bestText)

  return {
    records: out.records.map((rec) => ({ ...rec, _file: file.name })),
    meta: {
      rawAoa,
      headerRow: out.headerRow,
      cols: ws['!cols'] ?? null,
      sheet: bestName,
    },
  }
}

/**
 * Schreibt die Restliste einer Datei: Vorspann und Kopfzeile unveraendert,
 * erledigte Zeilen raus, Spaltenbreiten und Blattname wie im Original.
 * Gibt den Dateinamen zurueck, unter dem gespeichert wurde.
 */
export async function schreibeOffeneDatei(
  dateiname: string,
  meta: DateiMeta,
  behalten: ReadonlySet<number>,
): Promise<string> {
  const XLSX = await ladeXlsx()
  const aoa = buildOffeneAoa(meta.rawAoa, meta.headerRow, behalten)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  if (meta.cols) ws['!cols'] = meta.cols
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, meta.sheet || 'Tabelle1')
  const ziel = offeneDateiname(dateiname)
  XLSX.writeFile(wb, ziel)
  return ziel
}
