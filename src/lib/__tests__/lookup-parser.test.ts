import { describe, expect, it } from 'vitest'
import {
  buildRecords,
  detectColumns,
  detectHeaderRow,
  jiraLink,
  normalizePhone,
  phonesFrom,
  recKey,
} from '@/lib/lookup/parser'

/**
 * Der Parser ist aus dem alten Kampagnen-Lookup uebernommen. Diese Tests
 * halten sein Verhalten fest – die erwarteten Werte stammen aus einem
 * Differenztest der portierten gegen die urspruengliche Fassung
 * (503 Vergleiche, keine Abweichung).
 *
 * Wenn hier etwas rot wird, ist das kein Stilproblem: dann liest das Tool
 * eine echte PP-Liste anders als bisher.
 */

describe('normalizePhone: aus der Liste wird das innovaphone-Waehlformat', () => {
  it.each([
    ['+49 1512 3456789', '0015123456789'],
    ['004915123456789', '0015123456789'],
    ['49 1512 3456789', '0015123456789'],
    ['0431 1234567', '004311234567'],
    ['+43 664 1234567', '000436641234567'],
  ])('%s -> %s', (roh, erwartet) => {
    expect(normalizePhone(roh)).toBe(erwartet)
  })

  it('verwirft, was keine Nummer sein kann', () => {
    expect(normalizePhone('123')).toBe('')
    expect(normalizePhone('')).toBe('')
    expect(normalizePhone(null)).toBe('')
    expect(normalizePhone(undefined)).toBe('')
  })

  it('nimmt auch Zahlen aus Excel entgegen', () => {
    expect(normalizePhone(4915112345678)).toBe('0015112345678')
  })
})

describe('phonesFrom: eine Zelle kann mehrere Nummern tragen', () => {
  it.each([
    ['0431 12345 / 0170 9876543', ['0043112345', '001709876543']],
    ['0431 123456 oder 0170 987654', ['00431123456', '00170987654']],
    ['0431 123456; 0170 987654', ['00431123456', '00170987654']],
    ['+4915112345678 +4917612345678', ['0015112345678', '0017612345678']],
  ])('%s -> %j', (roh, erwartet) => {
    expect(phonesFrom(roh)).toEqual(erwartet)
  })

  it('liefert eine einzelne Nummer als einelementige Liste', () => {
    expect(phonesFrom('+49 1512 3456789')).toEqual(['0015123456789'])
  })

  it('liefert bei leerer Zelle nichts', () => {
    expect(phonesFrom('')).toEqual([])
    expect(phonesFrom(null)).toEqual([])
  })

  it('entfernt Dubletten innerhalb einer Zelle', () => {
    expect(phonesFrom('0431 123456 / 0431 123456')).toEqual(['00431123456'])
  })
})

describe('jiraLink', () => {
  it('baut aus einer blanken Vorgangsnummer den Link auf jira.ennit.de', () => {
    expect(jiraLink('PROJ-123')).toEqual({
      url: 'https://jira.ennit.de/browse/PROJ-123',
      label: 'PROJ-123',
    })
  })

  it('nimmt eine vorhandene URL, beschriftet sie aber mit der Nummer', () => {
    expect(jiraLink('https://jira.ennit.de/browse/ABC-9')).toEqual({
      url: 'https://jira.ennit.de/browse/ABC-9',
      label: 'ABC-9',
    })
  })

  it('findet die Nummer auch im Fliesstext', () => {
    expect(jiraLink('Text ABC-42 dazu')?.label).toBe('ABC-42')
  })

  it('liefert null, wenn nichts drinsteht', () => {
    expect(jiraLink('kein ticket')).toBeNull()
    expect(jiraLink('')).toBeNull()
  })
})

describe('detectHeaderRow: die Kopfzeile steht nicht immer oben', () => {
  it('ueberspringt Titel- und Leerzeilen', () => {
    const aoa = [
      ['Kampagnenliste August', null, null],
      [null, null, null],
      ['KdNr', 'Vorname', 'Nachname', 'Mobil', 'Strasse', 'PLZ', 'Ort'],
      ['1111', 'Anna', 'Schmidt', '0170 1111111', 'Hauptstr. 1', '24103', 'Kiel'],
    ]
    expect(detectHeaderRow(aoa)).toBe(2)
  })

  it('nimmt bei einer Liste ohne Vorspann die erste Zeile', () => {
    const aoa = [
      ['Kundennummer', 'Name', 'Telefon'],
      ['123456', 'Max Muster', '0431 123456'],
    ]
    expect(detectHeaderRow(aoa)).toBe(0)
  })
})

describe('detectColumns: STRICT schuetzt vor Fehl-Labels', () => {
  const headers = [
    'UUID',
    'Jira',
    'Kunde',
    'Rufnummer',
    'Vertragsstatus',
    'Neuer Tarif',
    'Zugehörige Verträge',
    'Ursache',
  ]
  const rows = [['u-1', 'ABC-1', 'C Kunde', '0431 5555', 'aktiv', 'Fiber 250', '2T9X', 'Preis']]
  const map = detectColumns(headers, rows)

  it('macht aus "Vertragsstatus" keine Vertragsnummer', () => {
    expect(map.vertrag).toBeUndefined()
  })

  it('macht aus "Neuer Tarif" kein Produkt', () => {
    expect(map.produkt).toBeUndefined()
  })

  it('nimmt "Ursache" dagegen an, weil der Header exakt passt', () => {
    expect(map.ursache).toBe(7)
  })

  it('merkt sich die UUID-Spalte, zeigt sie aber nicht als Extra', () => {
    expect(map._uuidCol).toBe(0)
    expect(map._extras.map((e) => e.header)).not.toContain('UUID')
  })

  it('reicht unbekannte, benannte Spalten als Extras durch', () => {
    expect(map._extras.map((e) => e.header)).toEqual([
      'Vertragsstatus',
      'Neuer Tarif',
      'Zugehörige Verträge',
    ])
  })
})

describe('buildRecords', () => {
  it('setzt Name und Anschrift aus Einzelspalten zusammen', () => {
    const aoa = [
      ['Kampagnenliste August', null, null],
      [null, null, null],
      ['KdNr', 'Vorname', 'Nachname', 'Mobil', 'Strasse', 'PLZ', 'Ort'],
      ['1111', 'Anna', 'Schmidt', '0170 1111111', 'Hauptstr. 1', '24103', 'Kiel'],
    ]
    const { records } = buildRecords(aoa)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      name: 'Anna Schmidt',
      address: 'Hauptstr. 1, 24103 Kiel',
      kdn: '1111',
      dial: '001701111111',
      telRaw: '0170 1111111',
      // Zeigt auf die Zeile in der Originaldatei – traegt den Export der Restliste.
      _aoaIdx: 3,
    })
  })

  it('behaelt den Originaltext der Telefonspalte', () => {
    const aoa = [
      ['Kundennummer', 'Telefon'],
      ['123456', '0431 12345 / 0170 9876543'],
    ]
    const r = buildRecords(aoa).records[0]!
    expect(r.telRaw).toBe('0431 12345 / 0170 9876543')
    expect(r.dials).toEqual(['0043112345', '001709876543'])
  })

  it('ueberspringt vollstaendig leere Zeilen', () => {
    const aoa = [
      ['Kundennummer', 'Name'],
      ['1', 'A'],
      [null, null],
      ['', ''],
      ['2', 'B'],
    ]
    expect(buildRecords(aoa).records).toHaveLength(2)
  })

  it('kommt mit leerer und kaputter Eingabe zurecht', () => {
    expect(buildRecords([]).records).toEqual([])
    expect(buildRecords(null).records).toEqual([])
    expect(buildRecords(undefined).records).toEqual([])
    expect(buildRecords([[]]).records).toEqual([])
  })
})

describe('recKey: Markierungen ueberleben die naechste Liste', () => {
  const basis = {
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
  }

  it('nimmt die UUID, wenn es eine gibt', () => {
    expect(recKey({ ...basis, _uuid: 'u-1', vertrag: 'V-1', kdn: '123' })).toBe('u-1')
  })

  it('faellt auf Vertrag, dann Kundennummer zurueck', () => {
    expect(recKey({ ...basis, vertrag: 'V-1', kdn: '123' })).toBe('V-1')
    expect(recKey({ ...basis, kdn: '123' })).toBe('123')
  })

  it('nimmt zuletzt Name und Nummer – die Zeilennummer waere zu wackelig', () => {
    expect(recKey({ ...basis, name: 'Max Muster', dial: '00431123' })).toBe('Max Muster|00431123')
  })
})
