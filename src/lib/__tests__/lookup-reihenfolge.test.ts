import { describe, expect, it } from 'vitest'
import { findeDubletten } from '@/lib/lookup/dubletten'
import {
  WARTEZEIT_MINUTEN,
  berechneReihenfolge,
  ordneEin,
  plaetze,
  type SortStand,
  type Stufe,
} from '@/lib/lookup/reihenfolge'
import { toggleBaustein } from '@/lib/lookup/storage'
import type { LookupRecord, StatusWert } from '@/lib/lookup/types'

/**
 * Die Reihenfolge beantwortet „wen rufe ich als Naechstes an".
 *
 * Zwei Zusagen stehen hier im Mittelpunkt: der Rueckruf geht vor (er ist ein
 * Versprechen), und ein gerade erst erfolgloser Versuch rutscht nach unten,
 * statt einen sofort nochmal waehlen zu lassen.
 */

const MIN = 60_000
const JETZT = Date.UTC(2026, 8, 14, 12, 0)

function rec(o: Partial<LookupRecord> = {}): LookupRecord {
  return {
    dials: ['004311'],
    dial: '004311',
    telRaw: '0431 1',
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

/** Eine Notiz so bauen, wie sie beim Antippen der Bausteine entsteht. */
function notiz(...bausteine: string[]): string {
  return bausteine.reduce((n, b) => toggleBaustein(n, b), '')
}

function stand(o: Partial<SortStand> = {}): SortStand {
  return { statusMap: {}, notizMap: {}, kontaktMap: {}, ...o }
}

function stufeVon(r: LookupRecord, s: SortStand, key = 'k'): Stufe {
  return ordneEin(r, key, s, JETZT).stufe
}

describe('ordneEin: wohin ein Eintrag gehoert', () => {
  it('der Erledigt-Haken beendet alles', () => {
    const s = stand({
      statusMap: { k: 'done' },
      notizMap: { k: notiz('Rückruf vereinbart') },
    })
    expect(stufeVon(rec(), s)).toBe('erledigt')
  })

  it('ein zugesagter Rueckruf geht vor – auch vor dem Pruefen-Haken', () => {
    const s = stand({ statusMap: { k: 'check' }, notizMap: { k: notiz('Rückruf vereinbart') } })
    expect(stufeVon(rec(), s)).toBe('rueckruf')
  })

  it('„Wiedervorlage" zaehlt genauso', () => {
    expect(stufeVon(rec(), stand({ notizMap: { k: notiz('Wiedervorlage') } }))).toBe('rueckruf')
  })

  it('„Noch zu pruefen" kommt vor die unberuehrten', () => {
    expect(stufeVon(rec(), stand({ statusMap: { k: 'check' } }))).toBe('geflaggt')
  })

  it('ein Nein ist ein Nein', () => {
    expect(stufeVon(rec(), stand({ notizMap: { k: notiz('Kein Interesse') } }))).toBe(
      'aussichtslos',
    )
    expect(stufeVon(rec(), stand({ notizMap: { k: notiz('Falsche Nummer') } }))).toBe(
      'aussichtslos',
    )
  })

  it('ohne Rufnummer laesst sich nichts waehlen', () => {
    expect(stufeVon(rec({ dials: [], dial: '' }), stand())).toBe('ohneNummer')
  })

  it('der Normalfall ist unberuehrt', () => {
    expect(stufeVon(rec(), stand())).toBe('unberuehrt')
  })

  it('wer gesprochen hat, rutscht unter die unberuehrten', () => {
    expect(stufeVon(rec(), stand({ notizMap: { k: notiz('Zufrieden') } }))).toBe('gesprochen')
    expect(stufeVon(rec(), stand({ notizMap: { k: 'hat sich gemeldet' } }))).toBe('gesprochen')
  })
})

describe('ordneEin: der zweite Versuch braucht Abstand', () => {
  const nichtErreicht = (vorMinuten: number) =>
    stand({
      notizMap: { k: notiz('Nicht erreicht') },
      kontaktMap: { k: JETZT - vorMinuten * MIN },
    })

  it('bleibt unten, solange der Versuch frisch ist', () => {
    expect(stufeVon(rec(), nichtErreicht(10))).toBe('zuFrisch')
    expect(stufeVon(rec(), nichtErreicht(WARTEZEIT_MINUTEN - 1))).toBe('zuFrisch')
  })

  it('kommt nach der Wartezeit wieder nach oben', () => {
    expect(stufeVon(rec(), nichtErreicht(WARTEZEIT_MINUTEN))).toBe('zweiterVersuch')
    expect(stufeVon(rec(), nichtErreicht(240))).toBe('zweiterVersuch')
  })

  it('gilt fuer die Mailbox genauso', () => {
    const s = stand({
      notizMap: { k: notiz('Mailbox') },
      kontaktMap: { k: JETZT - 200 * MIN },
    })
    expect(stufeVon(rec(), s)).toBe('zweiterVersuch')
  })

  it('wer laenger wartet, steht weiter oben', () => {
    const lang = ordneEin(rec(), 'k', nichtErreicht(300), JETZT)
    const kurz = ordneEin(rec(), 'k', nichtErreicht(100), JETZT)
    expect(lang.punkte).toBeGreaterThan(kurz.punkte)
  })

  it('der Wartebonus traegt nie in die naechste Stufe', () => {
    // Auch nach Tagen darf „zweiter Versuch" nicht zu „geflaggt" werden.
    const uralt = ordneEin(rec(), 'k', nichtErreicht(60 * 24 * 30), JETZT)
    const geflaggt = ordneEin(rec(), 'k', stand({ statusMap: { k: 'check' } }), JETZT)
    expect(uralt.punkte).toBeLessThan(geflaggt.punkte)
  })

  it('ohne Zeitstempel gilt der Versuch als lange her', () => {
    const s = stand({ notizMap: { k: notiz('Nicht erreicht') } })
    expect(stufeVon(rec(), s)).toBe('zweiterVersuch')
  })
})

describe('ordneEin liest Bausteine, nicht Freitext', () => {
  it('erkennt den angetippten Baustein', () => {
    expect(stufeVon(rec(), stand({ notizMap: { k: notiz('Kein Interesse') } }))).toBe(
      'aussichtslos',
    )
  })

  it('raet nicht am Freitext herum', () => {
    // „nicht zufrieden" enthaelt „Zufrieden" – wer hier auf Teilzeichenketten
    // ginge, kehrte die Aussage um. Freitext landet deshalb bei „gesprochen".
    expect(stufeVon(rec(), stand({ notizMap: { k: 'Kunde war nicht zufrieden' } }))).toBe(
      'gesprochen',
    )
  })

  it('findet den Baustein auch neben Freitext', () => {
    const n = toggleBaustein('ruft selbst zurück', 'Nicht erreicht')
    const s = stand({ notizMap: { k: n }, kontaktMap: { k: JETZT - 200 * MIN } })
    expect(stufeVon(rec(), s)).toBe('zweiterVersuch')
  })
})

describe('berechneReihenfolge', () => {
  const keine = new Map()

  it('sortiert nach Dringlichkeit', () => {
    const records = [
      rec({ vertrag: 'erledigt' }),
      rec({ vertrag: 'unberuehrt' }),
      rec({ vertrag: 'rueckruf' }),
      rec({ vertrag: 'geflaggt' }),
    ]
    const keys = ['a', 'b', 'c', 'd']
    const s = stand({
      statusMap: { a: 'done', d: 'check' },
      notizMap: { c: notiz('Rückruf vereinbart') },
    })
    const reihe = berechneReihenfolge(records, keys, s, keine, JETZT)
    expect(reihe.map((i) => records[i]!.vertrag)).toEqual([
      'rueckruf',
      'geflaggt',
      'unberuehrt',
      'erledigt',
    ])
  })

  it('haelt bei gleicher Dringlichkeit die Dateireihenfolge', () => {
    const records = [rec(), rec(), rec(), rec()]
    const keys = ['a', 'b', 'c', 'd']
    expect(berechneReihenfolge(records, keys, stand(), keine, JETZT)).toEqual([0, 1, 2, 3])
  })

  it('kommt mit einer leeren Liste klar', () => {
    expect(berechneReihenfolge([], [], stand(), keine, JETZT)).toEqual([])
  })

  it('gibt jeden Eintrag genau einmal zurueck', () => {
    const records = [0, 1, 2, 3, 4].map(() => rec())
    const keys = ['a', 'b', 'c', 'd', 'e']
    const s = stand({ statusMap: { a: 'done', c: 'check' } })
    const reihe = berechneReihenfolge(records, keys, s, keine, JETZT)
    expect([...reihe].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('berechneReihenfolge: Dubletten reisen als Gruppe', () => {
  it('stellt den Zwilling daneben, statt ihn unten zu lassen', () => {
    // 0 und 3 teilen die Nummer. 0 ist ein Rueckruf, 3 waere nur unberuehrt –
    // trotzdem gehoeren beide zusammen, es ist ein Anruf.
    const records = [
      rec({ vertrag: 'A', dials: ['0170111'], kdn: '1' }),
      rec({ vertrag: 'B', dials: ['0170222'], kdn: '2' }),
      rec({ vertrag: 'C', dials: ['0170333'], kdn: '3' }),
      rec({ vertrag: 'A2', dials: ['0170111'], kdn: '4' }),
    ]
    const keys = ['a', 'b', 'c', 'd']
    const s = stand({ notizMap: { a: notiz('Rückruf vereinbart') } })
    const reihe = berechneReihenfolge(records, keys, s, findeDubletten(records), JETZT)
    const namen = reihe.map((i) => records[i]!.vertrag)

    expect(namen.slice(0, 2)).toEqual(['A', 'A2'])
    // Und der Rest steht unveraendert dahinter.
    expect(namen.slice(2)).toEqual(['B', 'C'])
  })

  it('richtet die Gruppe nach ihrem dringendsten Mitglied aus', () => {
    // Der Rueckruf steht auf dem ZWEITEN Eintrag der Gruppe – die Gruppe muss
    // trotzdem ganz nach vorn.
    const records = [
      rec({ vertrag: 'B', dials: ['0170222'], kdn: '1' }),
      rec({ vertrag: 'A', dials: ['0170111'], kdn: '2' }),
      rec({ vertrag: 'A2', dials: ['0170111'], kdn: '3' }),
    ]
    const keys = ['b', 'a', 'a2']
    const s = stand({ notizMap: { a2: notiz('Rückruf vereinbart') } })
    const reihe = berechneReihenfolge(records, keys, s, findeDubletten(records), JETZT)
    const namen = reihe.map((i) => records[i]!.vertrag)

    expect(namen[0]).toBe('A2')
    expect(namen[1]).toBe('A')
    expect(namen[2]).toBe('B')
  })

  it('haelt eine Gruppe auch dann zusammen, wenn ein Mitglied erledigt ist', () => {
    const records = [
      rec({ vertrag: 'A', dials: ['0170111'], kdn: '1' }),
      rec({ vertrag: 'B', dials: ['0170222'], kdn: '2' }),
      rec({ vertrag: 'A2', dials: ['0170111'], kdn: '3' }),
    ]
    const keys = ['a', 'b', 'a2']
    const s = stand({ statusMap: { a: 'done' } })
    const reihe = berechneReihenfolge(records, keys, s, findeDubletten(records), JETZT)
    const namen = reihe.map((i) => records[i]!.vertrag)
    // A2 ist unberuehrt und zieht die Gruppe nach vorn; A haengt hinten dran.
    expect(namen).toEqual(['A2', 'A', 'B'])
  })
})

describe('plaetze', () => {
  it('macht aus der Reihenfolge den Platz je Eintrag', () => {
    expect(plaetze([2, 0, 1], 3)).toEqual([1, 2, 0])
  })

  it('laesst eine Teilmenge in derselben Ordnung sortieren', () => {
    const platz = plaetze([3, 1, 0, 2], 4)
    const gefiltert = [0, 1, 2, 3].sort((a, b) => platz[a]! - platz[b]!)
    expect(gefiltert).toEqual([3, 1, 0, 2])
  })
})

describe('Die Reihenfolge ist eine Ansichtssache', () => {
  it('ordnet nur Indizes und fasst die Datensaetze nicht an', () => {
    // Die Exporte laufen ueber `records` und `_aoaIdx`, nicht ueber die
    // Reihenfolge – deshalb darf diese Funktion nichts veraendern.
    const records = [rec({ vertrag: 'A' }), rec({ vertrag: 'B' })]
    const vorher = JSON.stringify(records)
    berechneReihenfolge(records, ['a', 'b'], stand({ statusMap: { a: 'done' } }), new Map(), JETZT)
    expect(JSON.stringify(records)).toBe(vorher)
  })

  it('laesst den uebergebenen Stand unangetastet', () => {
    const s = stand({ statusMap: { a: 'done' as StatusWert } })
    const vorher = JSON.stringify(s)
    berechneReihenfolge([rec()], ['a'], s, new Map(), JETZT)
    expect(JSON.stringify(s)).toBe(vorher)
  })
})
