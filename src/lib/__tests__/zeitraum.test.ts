import { describe, expect, it } from 'vitest'
import {
  ZEITRAUM_ARTEN,
  istZeitraumart,
  letzteZeitraeume,
  zeitraumAbgeschlossen,
  zeitraumFortschritt,
  zeitraumGrenzen,
  zeitraumName,
  zeitraumSpanne,
  zeitraumStand,
  zeitraumVon,
} from '@/lib/zeitraum'
import { ausTeilen, tagesSchluessel } from '@/lib/time'

/**
 * Kalendermonat und Abrechnungszeitraum tragen denselben Schluessel und
 * dieselbe Beschriftung – auseinander halten sie nur ihre Grenzen. Genau da
 * faellt ein Fehler nicht auf, sondern macht still falsche Zahlen: eine
 * Buchung vom 25. steht dann im falschen Balken. Deshalb wird der Stichtag
 * hier von beiden Seiten angefasst.
 */

describe('Zwei Zuschnitte auf denselben Monat', () => {
  it('ordnet eine Buchung vor dem Stichtag beiden Zuschnitten gleich zu', () => {
    const d = ausTeilen(2026, 9, 5, 10)
    expect(zeitraumVon('monat', d)).toBe('2026-09')
    expect(zeitraumVon('periode', d)).toBe('2026-09')
  })

  it('trennt sie ab dem Stichtag: derselbe Tag, zwei Schluessel', () => {
    const d = ausTeilen(2026, 8, 25, 10)
    expect(zeitraumVon('monat', d)).toBe('2026-08')
    expect(zeitraumVon('periode', d)).toBe('2026-09')
  })

  it('spannt den Kalendermonat vom 1. bis zum 1. des Folgemonats', () => {
    const { von, bis } = zeitraumGrenzen('monat', '2026-09')
    expect(tagesSchluessel(von)).toBe('2026-09-01')
    expect(tagesSchluessel(bis)).toBe('2026-10-01')
  })

  it('spannt den Abrechnungszeitraum vom 20. zum 20.', () => {
    const { von, bis } = zeitraumGrenzen('periode', '2026-09')
    expect(tagesSchluessel(von)).toBe('2026-08-20')
    expect(tagesSchluessel(bis)).toBe('2026-09-20')
  })

  it('beschriftet beide mit ihren Randtagen', () => {
    expect(zeitraumSpanne('monat', '2026-09')).toBe('01.09. – 30.09.2026')
    expect(zeitraumSpanne('periode', '2026-09')).toBe('20.08. – 19.09.2026')
    // Februar hat 28 Tage, 2028 dann 29 – die Spanne rechnet, sie zaehlt nicht.
    expect(zeitraumSpanne('monat', '2026-02')).toBe('01.02. – 28.02.2026')
    expect(zeitraumSpanne('monat', '2028-02')).toBe('01.02. – 29.02.2028')
  })

  it('nennt beide beim selben Namen – die Spanne trennt sie', () => {
    expect(zeitraumName('monat', '2026-09')).toBe('September 2026')
    expect(zeitraumName('periode', '2026-09')).toBe('September 2026')
  })

  it('ordnet jede Buchung in jedem Zuschnitt genau einem Zeitraum zu', () => {
    // Ein ganzes Jahr, beide Zuschnitte: keine Luecke, keine Ueberschneidung.
    for (const art of ZEITRAUM_ARTEN) {
      for (let tag = 1; tag <= 365; tag++) {
        const zeitpunkt = ausTeilen(2026, 1, tag, 12)
        const { von, bis } = zeitraumGrenzen(art, zeitraumVon(art, zeitpunkt))
        expect(zeitpunkt.getTime()).toBeGreaterThanOrEqual(von.getTime())
        expect(zeitpunkt.getTime()).toBeLessThan(bis.getTime())
      }
    }
  })

  it('zaehlt beide Reihen lueckenlos rueckwaerts, auch ueber die Jahresgrenze', () => {
    expect(letzteZeitraeume('monat', '2026-02', 4)).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
      '2025-11',
    ])
    expect(letzteZeitraeume('periode', '2026-02', 4)).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
      '2025-11',
    ])
  })
})

describe('Fortschritt und Abschluss', () => {
  const jetzt = ausTeilen(2026, 9, 8, 12)

  it('haelt beide laufenden Zeitraeume fuer offen', () => {
    expect(zeitraumAbgeschlossen('monat', '2026-09', jetzt)).toBe(false)
    expect(zeitraumAbgeschlossen('periode', '2026-09', jetzt)).toBe(false)
    expect(zeitraumAbgeschlossen('monat', '2026-08', jetzt)).toBe(true)
    expect(zeitraumAbgeschlossen('periode', '2026-08', jetzt)).toBe(true)
  })

  it('rechnet den Fortschritt auf der Laenge des jeweiligen Zeitraums', () => {
    // 8. September: gut ein Viertel des Kalendermonats, gut zwei Drittel des
    // Abrechnungszeitraums, der schon am 20. August begonnen hat.
    const monat = zeitraumFortschritt('monat', '2026-09', jetzt)
    const periode = zeitraumFortschritt('periode', '2026-09', jetzt)

    expect(monat.prozent).toBeGreaterThan(20)
    expect(monat.prozent).toBeLessThan(30)
    expect(periode.prozent).toBeGreaterThan(monat.prozent)
    expect(monat.restTage).toBe(23)
    expect(periode.restTage).toBe(12)
  })

  it('meldet null Resttage, wenn der Zeitraum vorbei ist', () => {
    expect(zeitraumFortschritt('periode', '2026-08', jetzt).restTage).toBe(0)
    expect(zeitraumFortschritt('periode', '2026-08', jetzt).prozent).toBe(100)
  })

  it('liefert den Stand fertig beschriftet – die Ansicht rechnet nicht mehr', () => {
    const stand = zeitraumStand('periode', jetzt)
    expect(stand).toMatchObject({
      art: 'periode',
      schluessel: '2026-09',
      artLabel: 'Abrechnungszeitraum',
      name: 'September 2026',
      spanne: '20.08. – 19.09.2026',
    })
  })

  it('erkennt nur die beiden bekannten Arten', () => {
    expect(istZeitraumart('monat')).toBe(true)
    expect(istZeitraumart('periode')).toBe(true)
    expect(istZeitraumart('quartal')).toBe(false)
    expect(istZeitraumart(undefined)).toBe(false)
  })
})
