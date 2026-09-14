/**
 * Welche Eintraege derselben Liste meinen denselben Anschluss?
 *
 * In den PP-Listen steht ein Kunde regelmaessig mehrfach: einmal je Vertrag,
 * oder zweimal, weil dieselbe Rufnummer an zwei Haushaltsmitgliedern haengt.
 * Ohne Hinweis ruft man zweimal an – und beim zweiten Mal ist der Kunde
 * verstaendlicherweise weniger freundlich.
 *
 * Zusammengefasst wird ueber drei Merkmale: Waehlnummer, Kundennummer,
 * Vertragsnummer. Die Zuordnung ist **transitiv** (Union-Find): teilt A mit B
 * die Nummer und B mit C die Kundennummer, gehoeren alle drei zusammen.
 * Das ist gewollt – es ist eine Gruppe von Zeilen, hinter der ein Anruf steckt.
 *
 * Markiert wird nur, nicht automatisch abgehakt: Zwei Vertraege desselben
 * Kunden koennen sehr wohl zwei Reportings brauchen. Die Entscheidung bleibt
 * beim Vertriebler.
 *
 * Reine Rechnung, kein DOM, keine Datenbank – deshalb in Node testbar.
 */

import type { LookupRecord } from './types'

export type DublettenGrund = 'nummer' | 'kunde'

export type Dublette = {
  /** Die uebrigen Eintraege der Gruppe, als Index in der uebergebenen Liste. */
  partner: number[]
  gruende: DublettenGrund[]
}

function normal(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Liefert je betroffenem Eintrag seine Gruppe. Eintraege ohne Dublette stehen
 * nicht in der Map – wer nichts findet, hat auch keine.
 */
export function findeDubletten(records: readonly LookupRecord[]): Map<number, Dublette> {
  const n = records.length
  const ergebnis = new Map<number, Dublette>()
  if (n < 2) return ergebnis

  /* ---- Union-Find ---- */
  const eltern = Array.from({ length: n }, (_, i) => i)
  function wurzel(i: number): number {
    let w = i
    while (eltern[w] !== w) {
      // Pfad flach halten, damit lange Ketten nicht jedes Mal durchlaufen werden.
      eltern[w] = eltern[eltern[w]!]!
      w = eltern[w]!
    }
    return w
  }
  function vereine(a: number, b: number) {
    const wa = wurzel(a)
    const wb = wurzel(b)
    if (wa !== wb) eltern[wb] = wa
  }

  /* ---- Gleiche Merkmale einsammeln ---- */
  const nachMerkmal = new Map<string, number[]>()
  function merke(praefix: string, wert: string, i: number) {
    const w = normal(wert)
    // Leere Felder sind kein Merkmal. Ohne diese Sperre landeten alle Zeilen
    // ohne Kundennummer in einer gemeinsamen Riesengruppe.
    if (!w) return
    const schluessel = praefix + w
    const liste = nachMerkmal.get(schluessel)
    if (liste) liste.push(i)
    else nachMerkmal.set(schluessel, [i])
  }

  records.forEach((r, i) => {
    r.dials.forEach((d) => merke('t:', d, i))
    merke('k:', r.kdn, i)
    merke('v:', r.vertrag, i)
  })

  for (const liste of nachMerkmal.values()) {
    for (let j = 1; j < liste.length; j++) vereine(liste[0]!, liste[j]!)
  }

  /* ---- Gruppen einsammeln ---- */
  const gruppen = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const w = wurzel(i)
    const g = gruppen.get(w)
    if (g) g.push(i)
    else gruppen.set(w, [i])
  }

  /* ---- Je Gruppe den Grund bestimmen ---- */
  function teiltSich(indizes: number[], werte: (r: LookupRecord) => string[]): boolean {
    const gesehen = new Set<string>()
    for (const i of indizes) {
      for (const roh of werte(records[i]!)) {
        const w = normal(roh)
        if (!w) continue
        if (gesehen.has(w)) return true
        gesehen.add(w)
      }
    }
    return false
  }

  for (const indizes of gruppen.values()) {
    if (indizes.length < 2) continue
    const gruende: DublettenGrund[] = []
    if (teiltSich(indizes, (r) => r.dials)) gruende.push('nummer')
    if (teiltSich(indizes, (r) => [r.kdn, r.vertrag])) gruende.push('kunde')
    if (!gruende.length) continue
    for (const i of indizes) {
      ergebnis.set(i, { partner: indizes.filter((j) => j !== i), gruende })
    }
  }

  return ergebnis
}

/**
 * Wie ein Partner in der Liste angesprochen wird – und wonach die Suche
 * springt, wenn man ihn antippt. Vertragsnummer zuerst, weil sie den Eintrag
 * am eindeutigsten benennt.
 */
export function partnerBezeichnung(r: LookupRecord): { bezeichnung: string; suche: string } {
  if (r.vertrag) return { bezeichnung: `Vertrag ${r.vertrag}`, suche: r.vertrag }
  if (r.kdn) return { bezeichnung: `KdNr ${r.kdn}`, suche: r.kdn }
  if (r.dial) return { bezeichnung: r.dial, suche: r.dial }
  return { bezeichnung: r.name || 'Weiterer Eintrag', suche: r.name }
}

/** Ein Satz, der sagt, warum die Karte markiert ist. */
export function dublettenText(d: Dublette): string {
  const was =
    d.gruende.length === 2
      ? 'Gleiche Rufnummer und gleicher Kunde'
      : d.gruende[0] === 'nummer'
        ? 'Gleiche Rufnummer'
        : 'Gleicher Kunde'
  const weitere = d.partner.length
  const wie_viele = weitere === 1 ? 'ein weiterer Eintrag' : `${weitere} weitere Einträge`
  return `${was} – ${wie_viele} in der Liste.`
}
