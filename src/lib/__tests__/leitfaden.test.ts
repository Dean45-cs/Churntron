import { describe, expect, it } from 'vitest'
import { ERSTE_GESPRAECHSPHASE, LEITFADEN } from '@/lib/leitfaden'

/**
 * Der Leitfaden bildet ein Dokument ab, mit dem gearbeitet wird. Wenn der
 * Ausbilder "Phase 4" sagt, muss im Fenster Phase 4 stehen – die Nummerierung
 * ist der Vertrag mit dem Dokument, nicht ein Umsetzungsdetail.
 *
 * Geprueft werden deshalb Eigenschaften, nicht einzelne Formulierungen: der
 * Wortlaut darf sich aendern, die Struktur nicht unbemerkt.
 */

const { phasen, einwaende, leitplanken } = LEITFADEN

describe('Phasen', () => {
  it('laufen lueckenlos und aufsteigend von 0 bis 10', () => {
    expect(phasen.map((p) => p.nr)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('haben Titel und eine Kurzform, die in die Schrittleiste passt', () => {
    for (const phase of phasen) {
      expect(phase.titel.trim().length, `Phase ${phase.nr}`).toBeGreaterThan(0)
      expect(phase.kurz.trim().length, `Phase ${phase.nr}`).toBeGreaterThan(0)
      expect(phase.kurz.length, `Phase ${phase.nr} – Kurzform zu lang`).toBeLessThanOrEqual(16)
    }
  })

  it('tragen alle mindestens einen Inhaltsblock', () => {
    for (const phase of phasen) {
      expect(phase.bloecke.length, `Phase ${phase.nr} ist leer`).toBeGreaterThan(0)
    }
  })

  it('haben keine leeren Bloecke', () => {
    for (const phase of phasen) {
      for (const block of phase.bloecke) {
        const ort = `Phase ${phase.nr}, Block ${block.art}`
        if (block.art === 'text') expect(block.text.trim(), ort).not.toBe('')
        if (block.art === 'oTon') expect(block.satz.trim(), ort).not.toBe('')
        if (block.art === 'luecke') expect(block.text.trim(), ort).not.toBe('')
        if (block.art === 'schritte' || block.art === 'stufen') {
          expect(block.punkte.length, ort).toBeGreaterThan(0)
          for (const punkt of block.punkte) expect(punkt.trim(), ort).not.toBe('')
        }
        if (block.art === 'zuordnung') {
          expect(block.zeilen.length, ort).toBeGreaterThan(0)
          for (const zeile of block.zeilen) {
            expect(zeile.von.trim(), ort).not.toBe('')
            expect(zeile.nach.trim(), ort).not.toBe('')
          }
        }
      }
    }
  })

  it('trennen Vorbereitung und Nachbereitung vom Gespraech ab', () => {
    // Genau eine Phase vor dem Anruf, genau eine danach – alles dazwischen
    // laeuft am Telefon. Daran haengt die abgesetzte Darstellung in der Leiste.
    expect(phasen.filter((p) => p.moment === 'vorher').map((p) => p.nr)).toEqual([0])
    expect(phasen.filter((p) => p.moment === 'danach').map((p) => p.nr)).toEqual([10])
    expect(phasen.filter((p) => p.moment === 'gespraech')).toHaveLength(phasen.length - 2)
  })

  it('beginnen das Gespraech mit einer Phase, die es auch gibt', () => {
    const start = phasen.find((p) => p.nr === ERSTE_GESPRAECHSPHASE)
    expect(start).toBeDefined()
    expect(start?.moment).toBe('gespraech')
  })

  it('zeigen die Einwandliste genau einmal, statt sie zu kopieren', () => {
    const mitEinwaenden = phasen.filter((p) => p.bloecke.some((b) => b.art === 'einwaende'))
    expect(mitEinwaenden.map((p) => p.nr)).toEqual([7])
  })
})

describe('Einwaende', () => {
  it('haben Einwand und Antwort, beide nicht leer', () => {
    expect(einwaende.length).toBeGreaterThan(0)
    for (const e of einwaende) {
      expect(e.einwand.trim()).not.toBe('')
      expect(e.antwort.trim()).not.toBe('')
    }
  })

  it('kommen jeder nur einmal vor', () => {
    const texte = einwaende.map((e) => e.einwand)
    expect(new Set(texte).size).toBe(texte.length)
  })
})

describe('Leitplanken', () => {
  it('sind die vier Regeln aus dem Dokument, keine leer', () => {
    expect(leitplanken).toHaveLength(4)
    for (const l of leitplanken) expect(l.regel.trim()).not.toBe('')
  })
})
