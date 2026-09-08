import { describe, expect, it } from 'vitest'
import { enthaeltKundendaten, pruefeEinwand, tagListe, zeilenListe } from '@/lib/objection-input'

/**
 * Die Wiki ist die erste Stelle im Projekt, an der Freitext in die Datenbank
 * kommt. Diese Tests halten fest, dass die Grundregel auch dort gilt: keine
 * Klardaten – siehe AGENTS.md und schema-privacy.test.ts.
 */

const GUELTIG = {
  title: 'Das ist mir zu teuer',
  category: 'PRICE',
  variants: 'kostet zu viel\ndas kann ich mir nicht leisten',
  answer: 'Verstehe ich – zu teuer verglichen womit? Meist ist es der alte Vertrag.',
  followUp: 'Wenn der Preis passen würde, wäre der Rest in Ordnung?',
  tags: 'Preis, Vergleich',
}

describe('Datenschutz: kein Kundenbezug im Freitext', () => {
  it('erkennt Telefon- und Vertragsnummern, auch mit Trennzeichen', () => {
    expect(enthaeltKundendaten('Rueckruf unter 0431 1234567')).toBe('nummer')
    expect(enthaeltKundendaten('Vertrag V-2026-10038 prüfen')).toBe('nummer')
    expect(enthaeltKundendaten('Kundennummer K-400013')).toBe('nummer')
  })

  it('erkennt E-Mail-Adressen', () => {
    expect(enthaeltKundendaten('Unterlagen an mustermann@example.org')).toBe('email')
  })

  it('haelt Datum, Bandbreite und Laufzeit fuer harmlos', () => {
    expect(enthaeltKundendaten('Gültig ab 01.08.2026, 24 Monate Laufzeit')).toBeNull()
    expect(enthaeltKundendaten('1000 Mbit für 49,90 € im Monat')).toBeNull()
  })

  it('weist einen Eintrag mit Vertragsnummer zurueck', () => {
    const ergebnis = pruefeEinwand({ ...GUELTIG, answer: `${GUELTIG.answer} (Vertrag 10038421)` })
    expect(ergebnis.ok).toBe(false)
    if (!ergebnis.ok) {
      expect(ergebnis.feld).toBe('answer')
      expect(ergebnis.fehler).toMatch(/keine Vertrags/i)
    }
  })
})

describe('Pruefung der Formulareingaben', () => {
  it('nimmt einen vollstaendigen Eintrag an', () => {
    const ergebnis = pruefeEinwand(GUELTIG)
    expect(ergebnis.ok).toBe(true)
    if (ergebnis.ok) {
      expect(ergebnis.wert.variants).toEqual(['kostet zu viel', 'das kann ich mir nicht leisten'])
      expect(ergebnis.wert.tags).toEqual(['Preis', 'Vergleich'])
      expect(ergebnis.wert.category).toBe('PRICE')
    }
  })

  it('besteht auf Ueberschrift, Thema und Antwort', () => {
    expect(pruefeEinwand({ ...GUELTIG, title: ' ' }).ok).toBe(false)
    expect(pruefeEinwand({ ...GUELTIG, category: 'IRGENDWAS' }).ok).toBe(false)
    expect(pruefeEinwand({ ...GUELTIG, answer: 'zu kurz' }).ok).toBe(false)
  })

  it('trennt Varianten nur an Zeilenumbruechen – Kommas gehoeren zum Satz', () => {
    expect(
      zeilenListe('Das ist mir zu teuer, ehrlich gesagt\nkostet zu viel', {
        anzahl: 5,
        laenge: 160,
      }),
    ).toEqual(['Das ist mir zu teuer, ehrlich gesagt', 'kostet zu viel'])
  })

  it('trennt Schlagworte am Komma und wirft Doppelungen weg', () => {
    expect(tagListe('Preis, Preis , Vergleich\nNutzen')).toEqual(['Preis', 'Vergleich', 'Nutzen'])
  })
})
