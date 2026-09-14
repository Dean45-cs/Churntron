/**
 * Typen des Kampagnen-Lookups.
 *
 * ACHTUNG: Die Datensaetze hier tragen Klardaten – Name, Anschrift, Telefon,
 * E-Mail. Genau deshalb verlaesst nichts davon den Browser. Es gibt keine
 * Server Action, keinen fetch und keinen Prisma-Aufruf, der einen
 * LookupRecord annimmt. Siehe AGENTS.md und
 * src/lib/__tests__/lookup-privacy.test.ts.
 */

/** Erkannte Spaltenarten. Die Reihenfolge der Zuweisung steht in ORDER. */
export type SpaltenTyp =
  | 'jira'
  | 'email'
  | 'kdn'
  | 'phone'
  | 'kommentar'
  | 'vorname'
  | 'nachname'
  | 'name'
  | 'address'
  | 'street'
  | 'plz'
  | 'ort'
  | 'vertrag'
  | 'produkt'
  | 'gfall'
  | 'ursache'

export type JiraLink = {
  url: string
  label: string
}

/** Eine benannte Spalte, die keiner bekannten Art entspricht – wird durchgereicht. */
export type ExtraFeld = {
  header: string
  value: string
}

export type Mapping = Partial<Record<SpaltenTyp, number>> & {
  _extras: { col: number; header: string }[]
  /** Technische ID-Spalte. Nicht anzeigen, aber als Schluessel fuer Merkposten gut. */
  _uuidCol: number
}

export type LookupRecord = {
  /** Alle Waehlnummern der Zeile, bereits im innovaphone-Format. */
  dials: string[]
  /** Die erste Waehlnummer – die, die der Klick auf die Karte kopiert. */
  dial: string
  /** Der Originaltext der Telefonspalte, unveraendert. */
  telRaw: string
  name: string
  address: string
  kdn: string
  email: string
  kommentar: string
  vertrag: string
  produkt: string
  gfall: string
  ursache: string
  jira: JiraLink | null
  _uuid: string
  /** Zeilennummer in der Originaldatei – traegt den Export der Restliste. */
  _aoaIdx: number
  extras: ExtraFeld[]
  /** Dateiname der Quelle. Erst beim Einlesen gesetzt, nicht vom Parser. */
  _file?: string
}

export type BuildErgebnis = {
  records: LookupRecord[]
  headers: string[]
  mapping: Mapping
  headerRow: number
}

/** Die Kampagne entscheidet, welches Formular am Erledigt-Haken haengt. */
export type KampagnenTyp = 'none' | 'welcome' | 'courtesy'

/** Bearbeitungsstand einer Karte. Leer = noch offen. */
export type StatusWert = 'done' | 'check' | ''

/** Die Pflichtangaben der Kampagne. Sie gehen in die Reporting-CSV. */
export type FormularStand = {
  homeId?: boolean
  protokoll?: boolean
  bewertung?: number
}

/**
 * In welcher Reihenfolge die Liste steht: nach Dringlichkeit oder so, wie PP
 * sie geschickt hat. Steht hier und nicht in `reihenfolge.ts`, damit
 * `storage.ts` die Einstellung lesen kann, ohne dass sich beide Module
 * gegenseitig importieren.
 */
export type Ordnung = 'beste' | 'datei'

export function istOrdnung(w: unknown): w is Ordnung {
  return w === 'beste' || w === 'datei'
}
