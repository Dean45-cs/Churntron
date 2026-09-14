/**
 * Typen fuer die mitgelieferte SheetJS-Build (siehe README in diesem Ordner).
 *
 * Bewusst nur der Ausschnitt, den das Kampagnen-Lookup wirklich benutzt:
 * Datei einlesen, AoA bauen, Arbeitsmappe schreiben. Alles andere bleibt
 * ungetippt, damit hier nicht nebenbei eine zweite, halbgare Typdefinition
 * der ganzen Bibliothek entsteht.
 */

/** Spaltenbreiten der Quelldatei – sie werden in die Restliste uebernommen. */
export interface ColInfo {
  wch?: number
  wpx?: number
  width?: number
  hidden?: boolean
  [key: string]: unknown
}

export interface WorkSheet {
  '!ref'?: string
  '!cols'?: ColInfo[]
  '!merges'?: unknown[]
  [cell: string]: unknown
}

export interface WorkBook {
  SheetNames: string[]
  Sheets: Record<string, WorkSheet>
}

export interface ReadOptions {
  type?: 'array' | 'buffer' | 'binary' | 'base64' | 'file'
  cellDates?: boolean
  raw?: boolean
}

export interface SheetToJsonOptions {
  /** `1` liefert ein Array-of-Arrays statt Objekten. Das Lookup nutzt nur das. */
  header?: 1
  raw?: boolean
  defval?: unknown
}

export interface WriteOptions {
  type?: 'array' | 'buffer' | 'binary' | 'base64'
  bookType?: 'xlsx' | 'xls' | 'csv'
}

export interface XlsxUtils {
  sheet_to_json(sheet: WorkSheet, options: SheetToJsonOptions): unknown[][]
  aoa_to_sheet(data: unknown[][]): WorkSheet
  book_new(): WorkBook
  book_append_sheet(book: WorkBook, sheet: WorkSheet, name?: string): void
}

export declare const version: string
export declare const utils: XlsxUtils
export declare function read(data: ArrayBuffer | Uint8Array, options: ReadOptions): WorkBook
export declare function write(book: WorkBook, options: WriteOptions): unknown
export declare function writeFile(book: WorkBook, filename: string): void
