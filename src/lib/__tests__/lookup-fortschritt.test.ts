import { describe, expect, it } from 'vitest'
import { berechneFortschritt, formatiereDauer } from '@/lib/lookup/fortschritt'
import type { StatusWert } from '@/lib/lookup/types'

/**
 * Der Fortschritt beantwortet „reicht die Zeit bis Feierabend". Die Tests
 * halten vor allem fest, wann er lieber NICHTS sagt: eine Hochrechnung aus
 * drei Anrufen in fuenf Minuten waere schlimmer als gar keine.
 */

const STUNDE = 3_600_000
const MIN = 60_000

/** 14.09.2026, 14:00 deutscher Zeit. */
const JETZT = Date.UTC(2026, 8, 14, 12, 0)

function stand(
  eintraege: { key: string; status?: StatusWert; vorMs?: number }[],
): [string[], Record<string, StatusWert>, Record<string, number>] {
  const keys = eintraege.map((e) => e.key)
  const statusMap: Record<string, StatusWert> = {}
  const tsMap: Record<string, number> = {}
  for (const e of eintraege) {
    if (e.status) statusMap[e.key] = e.status
    if (e.vorMs != null) tsMap[e.key] = JETZT - e.vorMs
  }
  return [keys, statusMap, tsMap]
}

describe('Fortschritt: die nackten Zahlen', () => {
  const [keys, statusMap, tsMap] = stand([
    { key: 'a', status: 'done', vorMs: 30 * MIN },
    { key: 'b', status: 'done', vorMs: 90 * MIN },
    { key: 'c', status: 'check', vorMs: 10 * MIN },
    { key: 'd' },
    { key: 'e' },
  ])
  const f = berechneFortschritt(keys, statusMap, tsMap, JETZT)

  it('zaehlt gesamt, erledigt, zu pruefen und unberuehrt', () => {
    expect(f.gesamt).toBe(5)
    expect(f.erledigt).toBe(2)
    expect(f.zuPruefen).toBe(1)
    expect(f.unberuehrt).toBe(2)
  })

  it('rechnet die zu Pruefenden zu den offenen – die sind nicht fertig', () => {
    expect(f.offen).toBe(3)
  })

  it('liefert den Anteil fuer den Balken', () => {
    expect(f.anteilErledigt).toBeCloseTo(0.4)
  })

  it('zaehlt fuer die letzte Stunde nur, was auch hineinfaellt', () => {
    // a liegt 30 min zurueck, b 90 min.
    expect(f.letzteStunde).toBe(1)
  })
})

describe('Fortschritt: leere und randstaendige Faelle', () => {
  it('kommt mit einer leeren Liste klar', () => {
    const f = berechneFortschritt([], {}, {}, JETZT)
    expect(f).toMatchObject({ gesamt: 0, erledigt: 0, offen: 0, anteilErledigt: 0 })
    expect(f.proStunde).toBeNull()
    expect(f.restMinuten).toBeNull()
  })

  it('ignoriert Markierungen von gestern', () => {
    const [keys, statusMap, tsMap] = stand([
      { key: 'a', status: 'done', vorMs: 20 * STUNDE },
      { key: 'b', status: 'done', vorMs: 30 * STUNDE },
    ])
    const f = berechneFortschritt(keys, statusMap, tsMap, JETZT)
    // Erledigt bleiben sie – nur zur heutigen Schicht zaehlen sie nicht.
    expect(f.erledigt).toBe(2)
    expect(f.seitSchichtbeginn).toBe(0)
    expect(f.schichtbeginn).toBeNull()
  })

  it('ignoriert Zeitstempel aus der Zukunft', () => {
    const keys = ['a']
    const f = berechneFortschritt(keys, { a: 'done' }, { a: JETZT + STUNDE }, JETZT)
    expect(f.letzteStunde).toBe(0)
    expect(f.seitSchichtbeginn).toBe(0)
  })

  it('zaehlt Eintraege mit gleichem Schluessel einzeln', () => {
    // Zwei Zeilen, die sich denselben Status teilen, sind trotzdem zwei Zeilen.
    const f = berechneFortschritt(['a', 'a'], { a: 'done' }, { a: JETZT - MIN }, JETZT)
    expect(f.gesamt).toBe(2)
    expect(f.erledigt).toBe(2)
  })
})

describe('Fortschritt: das Tempo wird nur behauptet, wenn es eines gibt', () => {
  it('schweigt, solange zu wenig erledigt ist', () => {
    const [keys, statusMap, tsMap] = stand([
      { key: 'a', status: 'done', vorMs: 40 * MIN },
      { key: 'b', status: 'done', vorMs: 20 * MIN },
      { key: 'c' },
    ])
    const f = berechneFortschritt(keys, statusMap, tsMap, JETZT)
    expect(f.seitSchichtbeginn).toBe(2)
    expect(f.proStunde).toBeNull()
    expect(f.restMinuten).toBeNull()
  })

  it('schweigt, solange die Schicht zu kurz laeuft', () => {
    // Vier Anrufe in fuenf Minuten waeren hochgerechnet 48 pro Stunde.
    const [keys, statusMap, tsMap] = stand([
      { key: 'a', status: 'done', vorMs: 5 * MIN },
      { key: 'b', status: 'done', vorMs: 4 * MIN },
      { key: 'c', status: 'done', vorMs: 2 * MIN },
      { key: 'd', status: 'done', vorMs: 1 * MIN },
      { key: 'e' },
    ])
    const f = berechneFortschritt(keys, statusMap, tsMap, JETZT)
    expect(f.proStunde).toBeNull()
    expect(f.restMinuten).toBeNull()
  })

  it('rechnet, sobald genug vorliegt', () => {
    // 6 Erledigte in 2 Stunden = 3 pro Stunde, 6 offen = 2 Stunden Rest.
    const eintraege = [0, 1, 2, 3, 4, 5].map((i) => ({
      key: 'd' + i,
      status: 'done' as StatusWert,
      vorMs: 2 * STUNDE - i * 20 * MIN,
    }))
    const offen = [0, 1, 2, 3, 4, 5].map((i) => ({ key: 'o' + i }))
    const [keys, statusMap, tsMap] = stand([...eintraege, ...offen])
    const f = berechneFortschritt(keys, statusMap, tsMap, JETZT)

    expect(f.seitSchichtbeginn).toBe(6)
    expect(f.proStunde).toBeCloseTo(3, 1)
    expect(f.restMinuten).toBe(120)
  })

  it('nennt keine Restdauer, wenn nichts mehr offen ist', () => {
    const eintraege = [0, 1, 2, 3].map((i) => ({
      key: 'd' + i,
      status: 'done' as StatusWert,
      vorMs: 60 * MIN - i * 10 * MIN,
    }))
    const [keys, statusMap, tsMap] = stand(eintraege)
    const f = berechneFortschritt(keys, statusMap, tsMap, JETZT)
    expect(f.offen).toBe(0)
    expect(f.restMinuten).toBeNull()
  })

  it('nimmt den Schichtbeginn aus der ersten Markierung des Tages', () => {
    const [keys, statusMap, tsMap] = stand([
      { key: 'a', status: 'check', vorMs: 3 * STUNDE },
      { key: 'b', status: 'done', vorMs: 1 * STUNDE },
    ])
    const f = berechneFortschritt(keys, statusMap, tsMap, JETZT)
    // Auch eine Pruefen-Markierung ist Arbeit und zaehlt fuer den Beginn.
    expect(f.schichtbeginn).toBe(JETZT - 3 * STUNDE)
  })
})

describe('formatiereDauer', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [59, '59 min'],
    [60, '1 h'],
    [85, '1 h 25 min'],
    [180, '3 h'],
    [200, '3 h 20 min'],
  ])('%i Minuten -> %s', (min, erwartet) => {
    expect(formatiereDauer(min)).toBe(erwartet)
  })

  it('wird ab zehn Stunden nicht mehr genauer', () => {
    // „12 h 40 min" Restzeit sagt ohnehin nur noch „heute nicht mehr".
    expect(formatiereDauer(760)).toBe('12 h')
  })

  it('faengt negative Werte ab', () => {
    expect(formatiereDauer(-5)).toBe('0 min')
  })
})
