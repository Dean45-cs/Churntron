/**
 * Die Suche des Lookups: ein Feld, das alles findet.
 *
 * Im Gespraech wird nach dem gesucht, was gerade zur Hand ist – mal die
 * Kundennummer, mal der Name, mal die Nummer im Display. Deshalb gibt es
 * keine Feldauswahl, sondern einen Text je Datensatz, in dem alles steht.
 *
 * Reine Rechnung – in Node testbar.
 */

import type { LookupRecord } from './types'

/**
 * Der Suchtext eines Datensatzes, klein geschrieben.
 *
 * Die Durchreich-Spalten (`extras`) sind bewusst dabei: in den echten Listen
 * steht unter "Zugehörige Verträge" die Nummer, nach der der Kunde am Telefon
 * fragt. Die eigene Notiz kommt dazu, damit "alle mit Rückruf" auffindbar
 * bleiben, ohne die Liste durchzublaettern.
 */
export function suchText(r: LookupRecord, notiz = ''): string {
  const teile: (string | undefined)[] = [
    r.kdn,
    r.name,
    r.telRaw,
    r.dial,
    r.email,
    r.vertrag,
    r.produkt,
    r.address,
    r.kommentar,
    r.gfall,
    r.ursache,
    r.jira?.label,
    notiz,
    ...r.dials,
    ...r.extras.map((e) => e.value),
  ]
  return teile.filter(Boolean).join('  ').toLowerCase()
}

/** Leere Suche heisst: alles zeigen. */
export function passt(hay: string, suche: string): boolean {
  const q = suche.trim().toLowerCase()
  if (!q) return true
  return hay.includes(q)
}
