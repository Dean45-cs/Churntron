import { describe, expect, it } from 'vitest'
import {
  berechneFortschritt,
  formatiereAnwahl,
  formatiereDauer,
  type FortschrittStand,
} from '@/lib/lookup/fortschritt'
import type { StatusWert } from '@/lib/lookup/types'

/**
 * Der Fortschritt beantwortet „reicht die Zeit bis Feierabend".
 *
 * Die wichtigste Zusage hier: Arbeit ist nicht nur der Erledigt-Haken. Wer
 * anwaehlt, niemanden erreicht und das notiert, hat diesen Kunden abgearbeitet.
 * Die zweite: der Fortschritt behauptet lieber gar kein Tempo als eines aus
 * drei Anrufen.
 */

const STUNDE = 3_600_000
const MIN = 60_000

/** 14.09.2026, 14:00 deutscher Zeit. */
const JETZT = Date.UTC(2026, 8, 14, 12, 0)

type Eintrag = { key: string; status?: StatusWert; notiz?: string; vorMs?: number }

function baue(eintraege: Eintrag[]): [string[], FortschrittStand] {
  const keys = eintraege.map((e) => e.key)
  const stand: FortschrittStand = { statusMap: {}, notizMap: {}, kontaktMap: {} }
  for (const e of eintraege) {
    if (e.status) stand.statusMap[e.key] = e.status
    if (e.notiz) stand.notizMap[e.key] = e.notiz
    if (e.vorMs != null) stand.kontaktMap[e.key] = JETZT - e.vorMs
  }
  return [keys, stand]
}

describe('Eine Notiz allein ist auch Arbeit', () => {
  const [keys, stand] = baue([
    { key: 'a', status: 'done', vorMs: 30 * MIN },
    { key: 'b', notiz: 'Nicht erreicht', vorMs: 20 * MIN },
    { key: 'c', notiz: 'Mailbox · nochmal versuchen', vorMs: 10 * MIN },
    { key: 'd' },
    { key: 'e' },
  ])
  const f = berechneFortschritt(keys, stand, JETZT)

  it('zaehlt „Nicht erreicht" in den Fortschritt', () => {
    // Genau der Fall, um den es geht: angewaehlt, niemand da, notiert.
    expect(f.bearbeitet).toBe(3)
    expect(f.nurNotiert).toBe(2)
  })

  it('haelt „erledigt" trotzdem getrennt – das ist die Zahl fuer die Auswertung', () => {
    expect(f.erledigt).toBe(1)
  })

  it('zaehlt sie auch beim Tempo mit', () => {
    // Ein erfolgloser Anruf kostet dieselbe Zeit wie ein Gespraech.
    expect(f.letzteStunde).toBe(3)
  })

  it('laesst nur die wirklich unberuehrten uebrig', () => {
    expect(f.unberuehrt).toBe(2)
  })

  it('treibt den Balken weiter als die Erledigten allein', () => {
    expect(f.anteilBearbeitet).toBeCloseTo(0.6)
    expect(f.anteilErledigt).toBeCloseTo(0.2)
  })

  it('ignoriert eine Notiz aus lauter Leerzeichen', () => {
    const [k, s] = baue([{ key: 'x', notiz: '   ', vorMs: MIN }])
    expect(berechneFortschritt(k, s, JETZT).bearbeitet).toBe(0)
  })

  it('zaehlt einen Eintrag mit Haken UND Notiz nur einmal', () => {
    const [k, s] = baue([{ key: 'x', status: 'done', notiz: 'Zufrieden', vorMs: MIN }])
    const g = berechneFortschritt(k, s, JETZT)
    expect(g.bearbeitet).toBe(1)
    expect(g.erledigt).toBe(1)
    expect(g.nurNotiert).toBe(0)
  })
})

describe('Fortschritt: die nackten Zahlen', () => {
  const [keys, stand] = baue([
    { key: 'a', status: 'done', vorMs: 30 * MIN },
    { key: 'b', status: 'done', vorMs: 90 * MIN },
    { key: 'c', status: 'check', vorMs: 10 * MIN },
    { key: 'd' },
    { key: 'e' },
  ])
  const f = berechneFortschritt(keys, stand, JETZT)

  it('zaehlt gesamt, erledigt, zu pruefen und unberuehrt', () => {
    expect(f.gesamt).toBe(5)
    expect(f.erledigt).toBe(2)
    expect(f.zuPruefen).toBe(1)
    expect(f.unberuehrt).toBe(2)
  })

  it('rechnet die zu Pruefenden zum Bearbeiteten', () => {
    expect(f.bearbeitet).toBe(3)
  })

  it('zaehlt fuer die letzte Stunde nur, was auch hineinfaellt', () => {
    // a liegt 30 min zurueck, c 10 min, b dagegen 90 min.
    expect(f.letzteStunde).toBe(2)
  })
})

describe('Fortschritt: leere und randstaendige Faelle', () => {
  it('kommt mit einer leeren Liste klar', () => {
    const f = berechneFortschritt([], { statusMap: {}, notizMap: {}, kontaktMap: {} }, JETZT)
    expect(f).toMatchObject({ gesamt: 0, bearbeitet: 0, unberuehrt: 0, anteilBearbeitet: 0 })
    expect(f.proStunde).toBeNull()
    expect(f.restMinuten).toBeNull()
  })

  it('ignoriert Anwahlen von gestern fuers Tempo, nicht fuer die Zahlen', () => {
    const [keys, stand] = baue([
      { key: 'a', status: 'done', vorMs: 20 * STUNDE },
      { key: 'b', notiz: 'Nicht erreicht', vorMs: 30 * STUNDE },
    ])
    const f = berechneFortschritt(keys, stand, JETZT)
    expect(f.bearbeitet).toBe(2)
    expect(f.seitSchichtbeginn).toBe(0)
    expect(f.schichtbeginn).toBeNull()
  })

  it('ignoriert Zeitstempel aus der Zukunft', () => {
    const f = berechneFortschritt(
      ['a'],
      { statusMap: { a: 'done' }, notizMap: {}, kontaktMap: { a: JETZT + STUNDE } },
      JETZT,
    )
    expect(f.letzteStunde).toBe(0)
    expect(f.seitSchichtbeginn).toBe(0)
  })

  it('nimmt einen gerade erst gesetzten Haken trotzdem mit', () => {
    // Die angezeigte Minute hinkt der echten Uhr bis zu 60 s hinterher; ein
    // eben gesetzter Zeitstempel liegt damit rechnerisch knapp in der Zukunft.
    // Ohne Toleranz erschiene „1 in der letzten Stunde" erst eine Minute spaeter.
    const f = berechneFortschritt(
      ['a'],
      { statusMap: {}, notizMap: { a: 'Nicht erreicht' }, kontaktMap: { a: JETZT + 45_000 } },
      JETZT,
    )
    expect(f.bearbeitet).toBe(1)
    expect(f.letzteStunde).toBe(1)
  })

  it('zaehlt Eintraege mit gleichem Schluessel einzeln', () => {
    const f = berechneFortschritt(
      ['a', 'a'],
      { statusMap: { a: 'done' }, notizMap: {}, kontaktMap: { a: JETZT - MIN } },
      JETZT,
    )
    expect(f.gesamt).toBe(2)
    expect(f.erledigt).toBe(2)
  })
})

describe('Fortschritt: das Tempo wird nur behauptet, wenn es eines gibt', () => {
  it('schweigt, solange zu wenig bearbeitet ist', () => {
    const [keys, stand] = baue([
      { key: 'a', status: 'done', vorMs: 40 * MIN },
      { key: 'b', notiz: 'Nicht erreicht', vorMs: 20 * MIN },
      { key: 'c' },
    ])
    const f = berechneFortschritt(keys, stand, JETZT)
    expect(f.seitSchichtbeginn).toBe(2)
    expect(f.proStunde).toBeNull()
    expect(f.restMinuten).toBeNull()
  })

  it('schweigt, solange die Schicht zu kurz laeuft', () => {
    const [keys, stand] = baue([
      { key: 'a', status: 'done', vorMs: 5 * MIN },
      { key: 'b', status: 'done', vorMs: 4 * MIN },
      { key: 'c', notiz: 'Mailbox', vorMs: 2 * MIN },
      { key: 'd', status: 'done', vorMs: 1 * MIN },
      { key: 'e' },
    ])
    const f = berechneFortschritt(keys, stand, JETZT)
    expect(f.proStunde).toBeNull()
    expect(f.restMinuten).toBeNull()
  })

  it('rechnet, sobald genug vorliegt – Notizen zaehlen mit', () => {
    // 6 Bearbeitete in 2 Stunden = 3 pro Stunde, 6 unberuehrt = 2 Stunden.
    const bearbeitet: Eintrag[] = [0, 1, 2, 3, 4, 5].map((i) => ({
      key: 'b' + i,
      // Die Haelfte davon nur notiert – am Tempo aendert das nichts.
      ...(i % 2 ? { status: 'done' as StatusWert } : { notiz: 'Nicht erreicht' }),
      vorMs: 2 * STUNDE - i * 20 * MIN,
    }))
    const offen: Eintrag[] = [0, 1, 2, 3, 4, 5].map((i) => ({ key: 'o' + i }))
    const [keys, stand] = baue([...bearbeitet, ...offen])
    const f = berechneFortschritt(keys, stand, JETZT)

    expect(f.seitSchichtbeginn).toBe(6)
    expect(f.proStunde).toBeCloseTo(3, 1)
    expect(f.restMinuten).toBe(120)
  })

  it('schaetzt den Weg durch die UNBERUEHRTEN, nicht durch die nicht Erledigten', () => {
    // 4 bearbeitet (davon nur 1 erledigt), 4 unberuehrt.
    // Ginge die Schaetzung von „nicht erledigt" aus, kaeme das Doppelte heraus.
    const bearbeitet: Eintrag[] = [0, 1, 2, 3].map((i) => ({
      key: 'b' + i,
      ...(i === 0 ? { status: 'done' as StatusWert } : { notiz: 'Nicht erreicht' }),
      vorMs: 2 * STUNDE - i * 30 * MIN,
    }))
    const offen: Eintrag[] = [0, 1, 2, 3].map((i) => ({ key: 'o' + i }))
    const [keys, stand] = baue([...bearbeitet, ...offen])
    const f = berechneFortschritt(keys, stand, JETZT)

    expect(f.bearbeitet).toBe(4)
    expect(f.erledigt).toBe(1)
    expect(f.unberuehrt).toBe(4)
    // 4 in 2 h = 2/h, 4 unberuehrt -> 2 h.
    expect(f.restMinuten).toBe(120)
  })

  it('nennt keine Restdauer, wenn nichts mehr unberuehrt ist', () => {
    const eintraege: Eintrag[] = [0, 1, 2, 3].map((i) => ({
      key: 'd' + i,
      status: 'done' as StatusWert,
      vorMs: 60 * MIN - i * 10 * MIN,
    }))
    const [keys, stand] = baue(eintraege)
    const f = berechneFortschritt(keys, stand, JETZT)
    expect(f.unberuehrt).toBe(0)
    expect(f.restMinuten).toBeNull()
  })

  it('nimmt den Schichtbeginn aus der ersten Anwahl des Tages', () => {
    const [keys, stand] = baue([
      { key: 'a', notiz: 'Nicht erreicht', vorMs: 3 * STUNDE },
      { key: 'b', status: 'done', vorMs: 1 * STUNDE },
    ])
    const f = berechneFortschritt(keys, stand, JETZT)
    // Auch ein erfolgloser Anruf ist der Anfang der Schicht.
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
    expect(formatiereDauer(760)).toBe('12 h')
  })

  it('faengt negative Werte ab', () => {
    expect(formatiereDauer(-5)).toBe('0 min')
  })
})

describe('formatiereAnwahl', () => {
  it('nennt fuer heute nur die Uhrzeit', () => {
    expect(formatiereAnwahl(JETZT - 90 * MIN, JETZT)).toBe('12:30')
  })

  it('sagt „gestern" dazu', () => {
    expect(formatiereAnwahl(JETZT - 20 * STUNDE, JETZT)).toBe('gestern 18:00')
  })

  it('nennt sonst Tag und Monat', () => {
    expect(formatiereAnwahl(JETZT - 3 * 24 * STUNDE, JETZT)).toBe('11.09. 14:00')
  })

  it('rechnet in deutscher Zeit, nicht in der des Rechners', () => {
    // 14.09. 22:30 UTC ist der 15.09. um 00:30 in Deutschland.
    const mitternacht = Date.UTC(2026, 8, 14, 22, 30)
    expect(formatiereAnwahl(mitternacht, mitternacht)).toBe('00:30')
  })
})
