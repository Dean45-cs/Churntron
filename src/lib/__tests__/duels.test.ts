import { describe, expect, it } from 'vitest'
import {
  bilanzAus,
  formatMetrik,
  phaseLebt,
  phaseVon,
  punkteJeTeilnehmer,
  vorlagenZeitraum,
  werteDuellAus,
  LEERE_ROHDATEN,
  SEITEN_GROESSE,
  type Rohdaten,
} from '@/lib/duels'
import { periodeVon, periodenZeitraum } from '@/lib/period'
import { tagesBeginn, tagesEnde, wochenBeginn } from '@/lib/time'

/**
 * Die Duell-Logik ohne Datenbank.
 *
 * Geprueft wird, worauf sich im Zweifel jemand beruft: dass der Zeitraum an
 * beiden Enden richtig schneidet, dass Storno nicht mitzaehlt und dass die
 * beiden Balkenhaelften zusammen genau 100 ergeben.
 */

const A = 'user-a'
const B = 'user-b'

function provision(userId: string, occurredAt: Date, amountCents: number, extra = {}) {
  return {
    userId,
    occurredAt,
    amountCents,
    status: 'PENDING' as const,
    kategorie: 'CAMPAIGN' as const,
    ...extra,
  }
}

const VON = new Date('2026-09-10T00:00:00Z')
const BIS = new Date('2026-09-11T00:00:00Z')

describe('punkteJeTeilnehmer', () => {
  it('summiert die Provision im Fenster', () => {
    const roh: Rohdaten = {
      ...LEERE_ROHDATEN,
      provisionen: [
        provision(A, new Date('2026-09-10T09:00:00Z'), 650),
        provision(A, new Date('2026-09-10T15:00:00Z'), 100),
        provision(B, new Date('2026-09-10T11:00:00Z'), 4000),
      ],
    }
    expect(punkteJeTeilnehmer('COMMISSION_CENTS', [A, B], VON, BIS, roh)).toEqual({
      [A]: 750,
      [B]: 4000,
    })
  })

  it('nimmt den Start mit und das Ende nicht – sonst zaehlt Mitternacht doppelt', () => {
    const roh: Rohdaten = {
      ...LEERE_ROHDATEN,
      provisionen: [provision(A, VON, 100), provision(A, BIS, 500)],
    }
    expect(punkteJeTeilnehmer('COMMISSION_CENTS', [A], VON, BIS, roh)[A]).toBe(100)
  })

  it('laesst Storno aussen vor – im Duell wie im Verdienst', () => {
    const roh: Rohdaten = {
      ...LEERE_ROHDATEN,
      provisionen: [
        provision(A, new Date('2026-09-10T09:00:00Z'), 650),
        provision(A, new Date('2026-09-10T10:00:00Z'), 650, { status: 'CLAWBACK' as const }),
      ],
    }
    expect(punkteJeTeilnehmer('COMMISSION_CENTS', [A], VON, BIS, roh)[A]).toBe(650)
    expect(punkteJeTeilnehmer('BOOKINGS', [A], VON, BIS, roh)[A]).toBe(1)
  })

  it('zaehlt als Abschluss nur Privat und Business', () => {
    const roh: Rohdaten = {
      ...LEERE_ROHDATEN,
      provisionen: [
        provision(A, new Date('2026-09-10T09:00:00Z'), 100, { kategorie: 'SALE_PRIVATE' as const }),
        provision(A, new Date('2026-09-10T10:00:00Z'), 100, {
          kategorie: 'SALE_BUSINESS' as const,
        }),
        provision(A, new Date('2026-09-10T11:00:00Z'), 100, { kategorie: 'ADDON' as const }),
        provision(A, new Date('2026-09-10T12:00:00Z'), 100, { kategorie: null }),
      ],
    }
    expect(punkteJeTeilnehmer('SALES', [A], VON, BIS, roh)[A]).toBe(2)
    expect(punkteJeTeilnehmer('BOOKINGS', [A], VON, BIS, roh)[A]).toBe(4)
  })

  it('trennt Gespraeche von Rueckgewinnungen', () => {
    const roh: Rohdaten = {
      ...LEERE_ROHDATEN,
      aktivitaeten: [
        { userId: A, occurredAt: new Date('2026-09-10T09:00:00Z'), typ: 'CALL', ergebnis: 'WON' },
        {
          userId: A,
          occurredAt: new Date('2026-09-10T10:00:00Z'),
          typ: 'CALL',
          ergebnis: 'NOT_REACHED',
        },
        { userId: A, occurredAt: new Date('2026-09-10T11:00:00Z'), typ: 'EMAIL', ergebnis: 'WON' },
      ],
    }
    expect(punkteJeTeilnehmer('CALLS', [A], VON, BIS, roh)[A]).toBe(2)
    expect(punkteJeTeilnehmer('CHURN_SAVED', [A], VON, BIS, roh)[A]).toBe(2)
  })

  it('ignoriert Zeilen von Leuten, die nicht mitspielen', () => {
    const roh: Rohdaten = {
      ...LEERE_ROHDATEN,
      punkte: [
        { userId: A, occurredAt: new Date('2026-09-10T09:00:00Z'), punkte: 10 },
        { userId: 'fremd', occurredAt: new Date('2026-09-10T09:00:00Z'), punkte: 99 },
      ],
    }
    const stand = punkteJeTeilnehmer('POINTS', [A], VON, BIS, roh)
    expect(stand).toEqual({ [A]: 10 })
  })

  it('setzt jede Teilnehmerin auf null, auch ohne eine einzige Zeile', () => {
    expect(punkteJeTeilnehmer('POINTS', [A, B], VON, BIS, LEERE_ROHDATEN)).toEqual({
      [A]: 0,
      [B]: 0,
    })
  })
})

describe('werteDuellAus', () => {
  const teilnehmer = [
    { userId: A, name: 'A', seite: 1, angenommen: true },
    { userId: B, name: 'B', seite: 2, angenommen: true },
  ]

  it('erkennt die fuehrende Seite und den Vorsprung', () => {
    const stand = werteDuellAus({
      teilnehmer,
      werte: { [A]: 750, [B]: 500 },
      target: null,
      beendet: false,
    })
    expect(stand.seiten[0]?.fuehrt).toBe(true)
    expect(stand.vorsprung).toBe(250)
    expect(stand.unentschieden).toBe(false)
    // Solange gespielt wird, fuehrt jemand – gewonnen hat noch niemand.
    expect(stand.gewinnerSeite).toBeNull()
  })

  it('kuert erst nach Schluss einen Sieger', () => {
    const stand = werteDuellAus({
      teilnehmer,
      werte: { [A]: 750, [B]: 500 },
      target: null,
      beendet: true,
    })
    expect(stand.gewinnerSeite).toBe(1)
  })

  it('nennt Gleichstand ein Unentschieden und niemanden Sieger', () => {
    const stand = werteDuellAus({
      teilnehmer,
      werte: { [A]: 500, [B]: 500 },
      target: null,
      beendet: true,
    })
    expect(stand.unentschieden).toBe(true)
    expect(stand.gewinnerSeite).toBeNull()
    expect(stand.vorsprung).toBe(0)
    expect(stand.seiten.every((s) => !s.fuehrt)).toBe(true)
  })

  it('teilt den Balken exakt in 100 Prozent – auch bei krummen Werten', () => {
    for (const [a, b] of [
      [1, 2],
      [7, 993],
      [333, 667],
      [1, 0],
    ]) {
      const stand = werteDuellAus({
        teilnehmer,
        werte: { [A]: a!, [B]: b! },
        target: null,
        beendet: false,
      })
      expect(stand.seiten.reduce((s, x) => s + x.anteil, 0)).toBe(100)
    }
  })

  it('steht bei 0 zu 0 in der Mitte statt auf einer Seite zu kippen', () => {
    const stand = werteDuellAus({
      teilnehmer,
      werte: { [A]: 0, [B]: 0 },
      target: null,
      beendet: false,
    })
    expect(stand.seiten.map((s) => s.anteil)).toEqual([50, 50])
  })

  it('rechnet bei 2 gegen 2 die Seite und nicht die Person', () => {
    const vier = [
      { userId: 'a1', name: 'A1', seite: 1, angenommen: true },
      { userId: 'a2', name: 'A2', seite: 1, angenommen: true },
      { userId: 'b1', name: 'B1', seite: 2, angenommen: true },
      { userId: 'b2', name: 'B2', seite: 2, angenommen: false },
    ]
    const stand = werteDuellAus({
      teilnehmer: vier,
      werte: { a1: 100, a2: 50, b1: 200, b2: 0 },
      target: null,
      beendet: true,
    })
    expect(stand.seiten.map((s) => s.wert)).toEqual([150, 200])
    expect(stand.gewinnerSeite).toBe(2)
    expect(stand.seiten[0]?.mitglieder).toHaveLength(2)
  })

  it('misst den Zielfortschritt an der fuehrenden Seite und deckelt bei 100', () => {
    const knapp = werteDuellAus({
      teilnehmer,
      werte: { [A]: 5, [B]: 1 },
      target: 10,
      beendet: false,
    })
    expect(knapp.zielProzent).toBe(50)
    expect(knapp.zielErreicht).toBe(false)

    const drueber = werteDuellAus({
      teilnehmer,
      werte: { [A]: 25, [B]: 1 },
      target: 10,
      beendet: false,
    })
    expect(drueber.zielProzent).toBe(100)
    expect(drueber.zielErreicht).toBe(true)
  })
})

describe('phaseVon', () => {
  const jetzt = new Date('2026-09-10T12:00:00Z')
  const spaeter = new Date('2026-09-10T18:00:00Z')
  const frueher = new Date('2026-09-10T06:00:00Z')

  it.each([
    ['OPEN', spaeter, 'EINLADUNG'],
    ['OPEN', frueher, 'VERFALLEN'],
    ['RUNNING', spaeter, 'LAEUFT'],
    ['RUNNING', frueher, 'BEENDET'],
    ['FINISHED', frueher, 'BEENDET'],
    ['DECLINED', spaeter, 'ABGELEHNT'],
    ['CANCELLED', spaeter, 'ABGESAGT'],
  ] as const)('%s mit Ende %s ist %s', (status, endsAt, erwartet) => {
    expect(phaseVon(status, endsAt, jetzt)).toBe(erwartet)
  })

  it('rechnet nur fuer Phasen, in denen wirklich gespielt wurde', () => {
    expect(phaseLebt('LAEUFT')).toBe(true)
    expect(phaseLebt('EINLADUNG')).toBe(true)
    expect(phaseLebt('BEENDET')).toBe(true)
    expect(phaseLebt('ABGELEHNT')).toBe(false)
    expect(phaseLebt('ABGESAGT')).toBe(false)
  })
})

describe('vorlagenZeitraum', () => {
  // Ein Nachmittag mitten in der deutschen Sommerzeit.
  const jetzt = new Date('2026-09-10T14:30:00Z')

  it('nimmt fuer "heute" die deutschen Tagesgrenzen, nicht die des Servers', () => {
    const { von, bis } = vorlagenZeitraum('HEUTE', jetzt)
    expect(von).toEqual(tagesBeginn(jetzt))
    expect(bis).toEqual(tagesEnde(jetzt))
    // 24 Stunden an einem Tag ohne Zeitumstellung.
    expect(bis.getTime() - von.getTime()).toBe(86_400_000)
  })

  it('startet die Woche am Montag und dauert genau sieben Tage', () => {
    const { von, bis } = vorlagenZeitraum('WOCHE', jetzt)
    expect(von).toEqual(wochenBeginn(jetzt))
    expect(bis.getTime() - von.getTime()).toBe(7 * 86_400_000)
  })

  it('nimmt fuer die Periode denselben Zuschnitt wie die Abrechnung', () => {
    expect(vorlagenZeitraum('PERIODE', jetzt)).toEqual(periodenZeitraum(periodeVon(jetzt)))
  })
})

describe('bilanzAus', () => {
  it('zaehlt nur beendete Duelle und nur die eigenen', () => {
    const bilanz = bilanzAus([
      { phase: 'BEENDET', meineSeite: 1, unentschieden: false, gewinnerSeite: 1 },
      { phase: 'BEENDET', meineSeite: 2, unentschieden: false, gewinnerSeite: 1 },
      { phase: 'BEENDET', meineSeite: 1, unentschieden: true, gewinnerSeite: null },
      // Laeuft noch – zaehlt nicht.
      { phase: 'LAEUFT', meineSeite: 1, unentschieden: false, gewinnerSeite: 1 },
      // Nur zugeschaut – zaehlt nicht.
      { phase: 'BEENDET', meineSeite: null, unentschieden: false, gewinnerSeite: 1 },
    ])
    expect(bilanz).toEqual({ siege: 1, niederlagen: 1, unentschieden: 1 })
  })
})

describe('Anzeige', () => {
  it('zeigt Provision in Euro und alles andere als blanke Zahl', () => {
    // Intl trennt Betrag und Waehrung mit einem schmalen geschuetzten
    // Leerzeichen – deshalb hier nicht auf ein normales Leerzeichen pruefen.
    expect(formatMetrik('COMMISSION_CENTS', 12_345)).toBe('123,45\u00a0€')
    expect(formatMetrik('SALES', 7)).toBe('7')
  })

  it('kennt die Seitengroessen der beiden Modi', () => {
    expect(SEITEN_GROESSE.ONE_VS_ONE).toBe(1)
    expect(SEITEN_GROESSE.TWO_VS_TWO).toBe(2)
  })
})
