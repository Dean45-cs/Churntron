import { describe, expect, it } from 'vitest'
import {
  dublettenText,
  findeDubletten,
  partnerBezeichnung,
  type Dublette,
} from '@/lib/lookup/dubletten'
import type { LookupRecord } from '@/lib/lookup/types'

/**
 * Dubletten sind der Fall „du rufst zweimal an". Wichtiger als jeden Treffer
 * zu finden ist, KEINEN falschen zu melden: eine Liste, in der alles markiert
 * ist, wird nach dem zweiten Mal ignoriert.
 */

function rec(o: Partial<LookupRecord>): LookupRecord {
  return {
    dials: [],
    dial: '',
    telRaw: '',
    name: '',
    address: '',
    kdn: '',
    email: '',
    kommentar: '',
    vertrag: '',
    produkt: '',
    gfall: '',
    ursache: '',
    jira: null,
    _uuid: '',
    _aoaIdx: 0,
    extras: [],
    ...o,
  }
}

describe('findeDubletten: was zusammengehoert', () => {
  it('erkennt dieselbe Rufnummer', () => {
    const records = [
      rec({ kdn: '1', dials: ['004311'], dial: '004311' }),
      rec({ kdn: '2', dials: ['004311'], dial: '004311' }),
    ]
    const d = findeDubletten(records)
    expect(d.size).toBe(2)
    expect(d.get(0)?.partner).toEqual([1])
    expect(d.get(1)?.partner).toEqual([0])
    expect(d.get(0)?.gruende).toEqual(['nummer'])
  })

  it('erkennt denselben Kunden mit zwei Vertraegen', () => {
    const records = [
      rec({ kdn: '100234', vertrag: 'V-1', dials: ['004311'] }),
      rec({ kdn: '100234', vertrag: 'V-2', dials: ['004312'] }),
    ]
    const d = findeDubletten(records)
    expect(d.get(0)?.gruende).toEqual(['kunde'])
    expect(d.get(0)?.partner).toEqual([1])
  })

  it('erkennt dieselbe Vertragsnummer zweimal', () => {
    const records = [rec({ vertrag: 'V-9' }), rec({ vertrag: 'V-9' })]
    expect(findeDubletten(records).get(0)?.gruende).toEqual(['kunde'])
  })

  it('nennt beide Gruende, wenn beide zutreffen', () => {
    const records = [
      rec({ kdn: '100234', dials: ['004311'] }),
      rec({ kdn: '100234', dials: ['004311'] }),
    ]
    expect(findeDubletten(records).get(0)?.gruende).toEqual(['nummer', 'kunde'])
  })

  it('fasst transitiv zusammen', () => {
    // A und B teilen die Nummer, B und C die Kundennummer – hinter allen
    // dreien steckt ein Anruf.
    const records = [
      rec({ dials: ['004311'], kdn: '1' }),
      rec({ dials: ['004311'], kdn: '2' }),
      rec({ dials: ['004399'], kdn: '2' }),
    ]
    const d = findeDubletten(records)
    expect(d.size).toBe(3)
    expect(d.get(0)?.partner.sort()).toEqual([1, 2])
    expect(d.get(2)?.partner.sort()).toEqual([0, 1])
  })

  it('greift auch bei der zweiten Nummer einer Zelle', () => {
    const records = [
      rec({ kdn: '1', dials: ['004311', '001701'] }),
      rec({ kdn: '2', dials: ['001701'] }),
    ]
    expect(findeDubletten(records).size).toBe(2)
  })

  it('ignoriert Gross- und Kleinschreibung sowie Leerzeichen', () => {
    const records = [rec({ vertrag: ' V-9 ' }), rec({ vertrag: 'v-9' })]
    expect(findeDubletten(records).size).toBe(2)
  })
})

describe('findeDubletten: was NICHT zusammengehoert', () => {
  it('meldet nichts bei einer Liste ohne Wiederholung', () => {
    const records = [
      rec({ kdn: '1', vertrag: 'V-1', dials: ['004311'] }),
      rec({ kdn: '2', vertrag: 'V-2', dials: ['004312'] }),
      rec({ kdn: '3', vertrag: 'V-3', dials: ['004313'] }),
    ]
    expect(findeDubletten(records).size).toBe(0)
  })

  it('macht aus leeren Feldern keine Gruppe', () => {
    // Der wichtigste Fall: ohne Sperre haetten alle Zeilen ohne Kundennummer
    // dieselbe leere Kundennummer geteilt – und die halbe Liste waere markiert.
    const records = [rec({ name: 'A' }), rec({ name: 'B' }), rec({ name: 'C' })]
    expect(findeDubletten(records).size).toBe(0)
  })

  it('macht aus einer einzelnen Zeile keine Dublette', () => {
    expect(findeDubletten([rec({ kdn: '1', dials: ['004311'] })]).size).toBe(0)
  })

  it('kommt mit einer leeren Liste klar', () => {
    expect(findeDubletten([]).size).toBe(0)
  })

  it('nimmt eine Zeile mit zwei eigenen Nummern nicht als Dublette ihrer selbst', () => {
    const records = [rec({ kdn: '1', dials: ['004311', '004312'] })]
    expect(findeDubletten(records).size).toBe(0)
  })
})

describe('findeDubletten: groessere Gruppen', () => {
  it('haelt eine Sammelnummer als eine Gruppe zusammen', () => {
    // In B2B-Listen haengen mehrere Ansprechpartner an derselben Zentrale.
    const records = [0, 1, 2, 3].map((i) => rec({ kdn: String(i), dials: ['004311'] }))
    const d = findeDubletten(records)
    expect(d.size).toBe(4)
    expect(d.get(0)?.partner).toEqual([1, 2, 3])
  })
})

describe('partnerBezeichnung: wonach die Suche springt', () => {
  it('nimmt die Vertragsnummer zuerst', () => {
    expect(partnerBezeichnung(rec({ vertrag: 'V-9', kdn: '1', dial: '004311' }))).toEqual({
      bezeichnung: 'Vertrag V-9',
      suche: 'V-9',
    })
  })

  it('dann die Kundennummer', () => {
    expect(partnerBezeichnung(rec({ kdn: '100234', dial: '004311' }))).toEqual({
      bezeichnung: 'KdNr 100234',
      suche: '100234',
    })
  })

  it('dann die Waehlnummer', () => {
    expect(partnerBezeichnung(rec({ dial: '004311' }))).toEqual({
      bezeichnung: '004311',
      suche: '004311',
    })
  })

  it('faellt zuletzt auf den Namen zurueck', () => {
    expect(partnerBezeichnung(rec({ name: 'Max Muster' })).bezeichnung).toBe('Max Muster')
  })
})

describe('dublettenText', () => {
  const d = (gruende: Dublette['gruende'], partner: number[]): Dublette => ({ gruende, partner })

  it.each([
    [d(['nummer'], [1]), 'Gleiche Rufnummer – ein weiterer Eintrag in der Liste.'],
    [d(['kunde'], [1]), 'Gleicher Kunde – ein weiterer Eintrag in der Liste.'],
    [
      d(['nummer', 'kunde'], [1, 2]),
      'Gleiche Rufnummer und gleicher Kunde – 2 weitere Einträge in der Liste.',
    ],
  ])('formuliert den Hinweis', (dublette, erwartet) => {
    expect(dublettenText(dublette)).toBe(erwartet)
  })
})
