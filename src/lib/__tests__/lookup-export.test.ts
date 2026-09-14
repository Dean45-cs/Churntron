import { describe, expect, it } from 'vitest'
import {
  REPORTING_SPALTEN,
  buildOffeneAoa,
  buildReportingZeilen,
  csvCell,
  datumsStempel,
  fmtTs,
  neutralizeFormula,
  offeneDateiname,
  reportingDateiname,
  zeilenAlsCsv,
  type ReportingStand,
} from '@/lib/lookup/export'
import type { LookupRecord } from '@/lib/lookup/types'

/**
 * DIESE DATEI HAELT EINE ZUSAGE FEST.
 *
 * Reporting-CSV und Restliste gehen an PP und in die Auswertung des Chefs.
 * Ihre Struktur ist identisch mit der des alten Kampagnen-Lookups (v1.1.0) –
 * gleiche Spalten, gleiche Reihenfolge, gleiches Trennzeichen, gleicher
 * Dateiname. Die erwarteten Werte stammen aus einem Differenztest gegen die
 * urspruengliche Fassung.
 *
 * Wenn hier etwas rot wird, weil eine Spalte dazugekommen ist: Das ist kein
 * Fortschritt, das ist ein kaputter Import auf der Gegenseite.
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

/** 14.09.2026, 08:05 deutscher Zeit. */
const T = Date.UTC(2026, 8, 14, 6, 5)

const records: LookupRecord[] = [
  rec({
    _uuid: 'u1',
    kdn: '123456',
    vertrag: 'V-1',
    name: 'Max Muster',
    telRaw: '+49 1512 3456789',
    dials: ['0015123456789'],
    dial: '0015123456789',
    _file: 'Welcome Call August.xlsx',
    _aoaIdx: 2,
  }),
  rec({
    _uuid: 'u2',
    kdn: '234567',
    name: 'Erika Beispiel',
    telRaw: '0431 1/2',
    dials: ['04311', '04312'],
    dial: '04311',
    _file: 'Welcome Call August.xlsx',
    _aoaIdx: 3,
  }),
  rec({
    _uuid: 'u3',
    kdn: '345678',
    name: 'Nie Angefasst',
    telRaw: '0170 3',
    dials: ['01703'],
    dial: '01703',
    _file: 'Welcome Call August.xlsx',
    _aoaIdx: 4,
  }),
]

const stand: ReportingStand = {
  camp: 'welcome',
  statusMap: { u1: 'done', u2: 'check' },
  formMap: { u1: { homeId: true, protokoll: true, bewertung: 2 } },
  tsMap: { u1: T },
}

describe('Reporting-CSV: die Spalten sind die Zusage', () => {
  it('hat genau die zwoelf Spalten des alten Tools, in dieser Reihenfolge', () => {
    expect([...REPORTING_SPALTEN]).toEqual([
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
    ])
  })

  it('schreibt die Kopfzeile unveraendert', () => {
    const csv = zeilenAlsCsv(buildReportingZeilen(records, stand))
    expect(csv.split('\r\n')[0]).toBe(
      '﻿Kampagne;Datei;Kundennummer;Vertrag;Name;Telefon;Waehlnummer;Status;' +
        'HomeID_aufgenommen;Beratungsprotokoll_ausgehaendigt;Bewertung_Beratung;Bearbeitet_am',
    )
  })

  it('beginnt mit dem BOM, trennt mit Semikolon und endet Zeilen mit CRLF', () => {
    const csv = zeilenAlsCsv(buildReportingZeilen(records, stand))
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('\r\n')
    expect(csv.split('\r\n')[0]!.split(';')).toHaveLength(12)
  })

  it('nimmt nur auf, was in der Schicht angefasst wurde', () => {
    const zeilen = buildReportingZeilen(records, stand)
    // Kopfzeile + u1 (erledigt) + u2 (zu pruefen). u3 blieb unberuehrt.
    expect(zeilen).toHaveLength(3)
    expect(zeilen.map((z) => z[4])).toEqual(['Name', 'Max Muster', 'Erika Beispiel'])
  })

  it('schreibt eine vollstaendige Zeile genau so wie das alte Tool', () => {
    const zeilen = buildReportingZeilen(records, stand)
    expect(zeilen[1]).toEqual([
      'Welcome Call',
      'Welcome Call August.xlsx',
      '123456',
      'V-1',
      'Max Muster',
      '+49 1512 3456789',
      '0015123456789',
      'Erledigt',
      'Ja',
      'Ja',
      '2',
      '2026-09-14 08:05',
    ])
  })

  it('uebersetzt den Status ins Deutsche', () => {
    const zeilen = buildReportingZeilen(records, {
      ...stand,
      statusMap: { u1: 'done', u2: 'check', u3: '' },
      formMap: { ...stand.formMap, u3: { homeId: true } },
    })
    expect(zeilen.map((z) => z[7])).toEqual(['Status', 'Erledigt', 'Prüfen', 'Offen'])
  })
})

describe('Reporting-CSV: die Kampagne entscheidet ueber drei Spalten', () => {
  it('fragt beim Courtesy Call nur die Home-ID ab', () => {
    const zeilen = buildReportingZeilen(records, { ...stand, camp: 'courtesy' })
    expect(zeilen[1]!.slice(8, 11)).toEqual(['Ja', '', ''])
  })

  it('laesst alle drei Spalten leer, wenn keine Kampagne gewaehlt ist', () => {
    const zeilen = buildReportingZeilen(records, { ...stand, camp: 'none' })
    expect(zeilen[1]!.slice(8, 11)).toEqual(['', '', ''])
    expect(zeilen[1]![0]).toBe('')
  })

  it('schreibt "Nein" statt leer, wenn die Kampagne die Frage kennt', () => {
    const zeilen = buildReportingZeilen(records, stand)
    expect(zeilen[2]!.slice(8, 11)).toEqual(['Nein', 'Nein', ''])
  })
})

describe('CSV-Zellen: Excel darf daraus keine Formel machen', () => {
  it.each(['=SUM(A1)', '+49 431 1', '-5', '@user'])('entschaerft %s', (roh) => {
    expect(neutralizeFormula(roh)).toBe("'" + roh)
  })

  it('laesst harmlose Werte in Ruhe', () => {
    expect(neutralizeFormula('0431 123456')).toBe('0431 123456')
  })

  it('setzt Werte mit Semikolon, Anfuehrungszeichen oder Umbruch in Anfuehrungszeichen', () => {
    expect(csvCell('Erika; "Beispiel"')).toBe('"Erika; ""Beispiel"""')
    expect(csvCell('Zeilen\nUmbruch')).toBe('"Zeilen\nUmbruch"')
  })

  it('macht aus null und undefined eine leere Zelle', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('entschaerft eine Telefonnummer mit fuehrendem Plus auch in der Zelle', () => {
    expect(csvCell('+49 1512 3456789')).toBe("'+49 1512 3456789")
  })
})

describe('Zeitangaben stehen in deutscher Zeit, nicht in der des Rechners', () => {
  it('formatiert den Zeitstempel als "JJJJ-MM-TT HH:MM"', () => {
    expect(fmtTs(T)).toBe('2026-09-14 08:05')
  })

  it('rutscht um 00:30 deutscher Zeit nicht auf den Vortag', () => {
    // 14.09. 22:30 UTC ist der 15.09. um 00:30 in Deutschland.
    const mitternacht = Date.UTC(2026, 8, 14, 22, 30)
    expect(fmtTs(mitternacht)).toBe('2026-09-15 00:30')
    expect(datumsStempel(new Date(mitternacht))).toBe('20260915')
  })
})

describe('Dateinamen', () => {
  it.each([
    ['welcome', 'Welcome_Call_Reporting_20260914.csv'],
    ['courtesy', 'Courtesy_Call_Reporting_20260914.csv'],
    ['none', 'Kampagne_Reporting_20260914.csv'],
  ] as const)('Reporting bei Kampagne %s', (camp, erwartet) => {
    expect(reportingDateiname(camp, new Date(T))).toBe(erwartet)
  })

  it.each([
    ['Welcome Call August.xlsx', 'Welcome Call August_offen.xlsx'],
    ['liste.csv', 'liste_offen.xlsx'],
    ['a.b.xls', 'a.b_offen.xlsx'],
  ])('Restliste aus %s', (roh, erwartet) => {
    expect(offeneDateiname(roh)).toBe(erwartet)
  })
})

describe('Restliste: Vorspann bleibt, Erledigte gehen raus', () => {
  const rawAoa: unknown[][] = [
    ['Kampagnenliste August', null, null],
    ['Kundennummer', 'Name', 'Telefon'],
    ['123456', 'Max Muster', '+49 1512 3456789'],
    ['234567', 'Erika Beispiel', '0431 1/2'],
    ['345678', 'Nie Angefasst', '0170 3'],
  ]

  it('uebernimmt Titel- und Kopfzeile unveraendert', () => {
    const aoa = buildOffeneAoa(rawAoa, 1, new Set([3, 4]))
    expect(aoa[0]).toEqual(['Kampagnenliste August', null, null])
    expect(aoa[1]).toEqual(['Kundennummer', 'Name', 'Telefon'])
  })

  it('behaelt nur die offenen Zeilen, in der Reihenfolge der Originaldatei', () => {
    const aoa = buildOffeneAoa(rawAoa, 1, new Set([3, 4]))
    expect(aoa).toHaveLength(4)
    expect(aoa.slice(2).map((z) => z[1])).toEqual(['Erika Beispiel', 'Nie Angefasst'])
  })

  it('laesst die Originalzeilen unangetastet – auch die Rohwerte', () => {
    const aoa = buildOffeneAoa(rawAoa, 1, new Set([2]))
    expect(aoa[2]).toBe(rawAoa[2])
  })

  it('gibt bei komplett erledigter Liste nur den Kopf zurueck', () => {
    expect(buildOffeneAoa(rawAoa, 1, new Set())).toHaveLength(2)
  })

  it('veraendert die Quelle nicht', () => {
    const vorher = rawAoa.length
    buildOffeneAoa(rawAoa, 1, new Set([2, 3]))
    expect(rawAoa).toHaveLength(vorher)
  })
})

describe('Die internen Notizen bleiben intern', () => {
  it('kennt keine Notiz-Spalte', () => {
    expect(REPORTING_SPALTEN).not.toContain('Notiz')
    expect(REPORTING_SPALTEN.some((s) => /notiz|note|bemerkung/i.test(s))).toBe(false)
  })

  it('nimmt gar keine Notizen entgegen – auch nicht versehentlich', () => {
    // Der Schichtstand traegt eine notizMap. Wird sie mit durchgereicht,
    // darf sie in der Ausgabe trotzdem nicht auftauchen.
    const mitNotizen = {
      ...stand,
      notizMap: { u1: 'Rückruf vereinbart · will Kündigung prüfen' },
    } as ReportingStand
    const csv = zeilenAlsCsv(buildReportingZeilen(records, mitNotizen))
    expect(csv).not.toContain('Rückruf')
    expect(csv).not.toContain('Kündigung')
  })

  it('haelt die Spaltenzahl auch dann bei zwoelf', () => {
    const zeilen = buildReportingZeilen(records, stand)
    for (const z of zeilen) expect(z).toHaveLength(12)
  })

  it('nimmt einen Eintrag, zu dem NUR eine Notiz steht, gar nicht erst auf', () => {
    // „Nicht erreicht" zaehlt im Tool als Arbeit und faerbt den Fortschritt –
    // in der Auswertung hat der Kunde aber nichts verloren. Er geht ueber die
    // Restliste zurueck an PP, nicht ueber das Reporting an den Chef.
    const nurNotiert = { ...stand, statusMap: {}, formMap: {} }
    expect(buildReportingZeilen(records, nurNotiert)).toHaveLength(1) // nur der Kopf
  })

  it('nimmt den Zeitstempel aus tsMap, nicht aus einem Notiz-Zeitpunkt', () => {
    // Die Spalte heisst "Bearbeitet_am" und meint Status und Formular.
    // Eine spaeter getippte Notiz darf diesen Wert nicht verschieben –
    // deshalb fuehrt der Schichtstand dafuer eine eigene kontaktMap.
    const spaeterNotiert = {
      ...stand,
      kontaktMap: { u1: T + 3 * 3_600_000 },
    } as ReportingStand
    const zeilen = buildReportingZeilen(records, spaeterNotiert)
    expect(zeilen[1]![11]).toBe('2026-09-14 08:05')
  })
})
