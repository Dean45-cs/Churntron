import { describe, expect, it } from 'vitest'
import {
  STICHTAG,
  auszahlungsTag,
  letztePerioden,
  periodeAbgeschlossen,
  periodeDavor,
  periodenLabel,
  periodenZeitraum,
  periodeVon,
} from '@/lib/period'
import { ausTeilen, tagesSchluessel, teile, wochenBeginn } from '@/lib/time'

/**
 * Die Periodenrechnung ist die Stelle, an der sich ein Fehler nicht zeigt,
 * sondern nur falsche Zahlen macht: eine Buchung landet im falschen Monat und
 * fehlt beim Abgleich. Deshalb wird der Stichtag hier von beiden Seiten
 * angefasst – der 19., der 20. und die Jahresgrenze.
 */

describe('Periode 20. bis 20.', () => {
  it('schlaegt eine Buchung vor dem Stichtag dem laufenden Monat zu', () => {
    expect(periodeVon(ausTeilen(2026, 8, 19, 23, 59))).toBe('2026-08')
  })

  it('schlaegt eine Buchung ab dem Stichtag der naechsten Periode zu', () => {
    expect(periodeVon(ausTeilen(2026, 8, 20, 0, 0))).toBe('2026-09')
    expect(periodeVon(ausTeilen(2026, 8, 31, 23, 59))).toBe('2026-09')
  })

  it('kommt ueber die Jahresgrenze', () => {
    expect(periodeVon(ausTeilen(2026, 12, 20))).toBe('2027-01')
    expect(periodeDavor('2027-01')).toBe('2026-12')
  })

  it('spannt den Zeitraum vom 20. des Vormonats bis zum 20.', () => {
    const { von, bis } = periodenZeitraum('2026-09')
    expect(tagesSchluessel(von)).toBe('2026-08-20')
    expect(tagesSchluessel(bis)).toBe('2026-09-20')
    expect(teile(von).stunde).toBe(0)
  })

  it('zahlt eine Abrechnung spaeter aus, immer am Stichtag', () => {
    const tag = auszahlungsTag('2026-09')
    expect(tagesSchluessel(tag)).toBe('2026-10-20')
    expect(teile(tag).tag).toBe(STICHTAG)
  })

  it('beschriftet die Periode mit ihren beiden Randtagen', () => {
    expect(periodenLabel('2026-09')).toBe('20.08. – 19.09.2026')
  })

  it('haelt die laufende Periode fuer nicht abgeschlossen', () => {
    const jetzt = ausTeilen(2026, 9, 8, 12)
    expect(periodeAbgeschlossen('2026-09', jetzt)).toBe(false)
    expect(periodeAbgeschlossen('2026-08', jetzt)).toBe(true)
  })

  it('listet Perioden luecklos rueckwaerts auf', () => {
    expect(letztePerioden('2026-02', 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11'])
  })

  it('ordnet jede Buchung genau einer Periode zu', () => {
    // Ein ganzes Jahr durchgehen: keine Luecke, keine Ueberschneidung.
    for (let tag = 1; tag <= 365; tag++) {
      const zeitpunkt = ausTeilen(2026, 1, tag, 12)
      const periode = periodeVon(zeitpunkt)
      const { von, bis } = periodenZeitraum(periode)
      expect(zeitpunkt.getTime()).toBeGreaterThanOrEqual(von.getTime())
      expect(zeitpunkt.getTime()).toBeLessThan(bis.getTime())
    }
  })
})

describe('Zeitzone Europe/Berlin', () => {
  it('rechnet Sommerzeit mit: 00:30 deutscher Zeit ist noch derselbe Tag', () => {
    // 8. Juli 2026, 00:30 Uhr in Kiel ist 7. Juli 22:30 UTC.
    const zeitpunkt = ausTeilen(2026, 7, 8, 0, 30)
    expect(zeitpunkt.toISOString()).toBe('2026-07-07T22:30:00.000Z')
    expect(tagesSchluessel(zeitpunkt)).toBe('2026-07-08')
  })

  it('beginnt die Woche am Montag', () => {
    // Der 8. September 2026 ist ein Dienstag.
    expect(tagesSchluessel(wochenBeginn(ausTeilen(2026, 9, 8, 15)))).toBe('2026-09-07')
    expect(tagesSchluessel(wochenBeginn(ausTeilen(2026, 9, 13, 23)))).toBe('2026-09-07')
  })

  it('ueberlebt die Zeitumstellung im Maerz', () => {
    // In der Nacht auf den 29.03.2026 wird auf Sommerzeit gestellt.
    const vorher = ausTeilen(2026, 3, 28, 12)
    const nachher = ausTeilen(2026, 3, 29, 12)
    expect(nachher.getTime() - vorher.getTime()).toBe(23 * 3_600_000)
    expect(tagesSchluessel(nachher)).toBe('2026-03-29')
  })
})
