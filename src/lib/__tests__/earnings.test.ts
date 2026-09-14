import { describe, expect, it } from 'vitest'
import { werteVerdienstAus, type Arbeitsprofil, type Buchung } from '@/lib/earnings'
import { ausTeilen } from '@/lib/time'

/**
 * Die Auswertung ist die Stelle, an der aus 900 Buchungen die Zahlen werden,
 * mit denen jemand seinen Monat plant. Getestet wird deshalb nicht das Layout,
 * sondern die Rechnung: was zaehlt mit, was nicht, und stimmen die Schnitte.
 */

const profil: Arbeitsprofil = {
  wochenstunden: 40,
  arbeitstageProWoche: 5,
  grundgehaltCents: 250_000,
  steuerklasse: 1,
  kirchensteuerProzent: 0,
  kinderfreibetraege: 0,
  kinder: 0,
  kvZusatzBp: 290,
  steuerjahr: 2026,
}

const JETZT = ausTeilen(2026, 9, 8, 14)

function buchung(tag: Date, cents: number, extra: Partial<Buchung> = {}): Buchung {
  return {
    amountCents: cents,
    status: 'PENDING',
    occurredAt: tag,
    kategorie: 'CAMPAIGN',
    bezeichnung: 'Welcome Calls',
    ...extra,
  }
}

describe('Verdienst-Auswertung', () => {
  it('zaehlt Storno nirgends zum Verdienst, weist es aber aus', () => {
    const a = werteVerdienstAus(
      [
        buchung(ausTeilen(2026, 9, 8, 9), 650),
        buchung(ausTeilen(2026, 9, 8, 10), 200, { status: 'CLAWBACK' }),
      ],
      profil,
      '30',
      JETZT,
    )
    expect(a.zeitraeume.heute.summeCents).toBe(650)
    expect(a.zeitraeume.heute.anzahl).toBe(1)
    expect(a.fenster.stornoCents).toBe(200)
    expect(a.fenster.stornoAnzahl).toBe(1)
  })

  it('trennt heute, Woche, Monat, Quartal und Jahr sauber', () => {
    // Der 8.9.2026 ist ein Dienstag – der Montag davor gehoert noch zur Woche,
    // der Sonntag davor nicht mehr.
    const a = werteVerdienstAus(
      [
        buchung(ausTeilen(2026, 9, 8, 9), 100), // heute
        buchung(ausTeilen(2026, 9, 7, 9), 100), // Montag, dieselbe Woche
        buchung(ausTeilen(2026, 9, 6, 9), 100), // Sonntag, Vorwoche
        buchung(ausTeilen(2026, 8, 15, 9), 100), // Vormonat, gleiches Quartal
        buchung(ausTeilen(2026, 5, 15, 9), 100), // anderes Quartal, gleiches Jahr
        buchung(ausTeilen(2025, 12, 15, 9), 100), // Vorjahr
      ],
      profil,
      'alles',
      JETZT,
    )
    expect(a.zeitraeume.heute.anzahl).toBe(1)
    expect(a.zeitraeume.woche.anzahl).toBe(2)
    expect(a.zeitraeume.monat.anzahl).toBe(3)
    expect(a.zeitraeume.quartal.anzahl).toBe(4)
    expect(a.zeitraeume.jahr.anzahl).toBe(5)
    expect(a.zeitraeume.gesamt.anzahl).toBe(6)
  })

  it('rechnet die Schnitte auf der Laenge des Fensters', () => {
    // 30 Tage, 300 Euro: 10 Euro am Tag, 70 in der Woche.
    const buchungen = Array.from({ length: 30 }, (_, i) =>
      buchung(ausTeilen(2026, 9, 8 - i, 10), 1_000),
    )
    const a = werteVerdienstAus(buchungen, profil, '30', JETZT)

    expect(a.fenster.kalenderTage).toBe(30)
    expect(a.fenster.summeCents).toBe(30_000)
    expect(a.schnitt.proKalendertag).toBe(1_000)
    expect(a.schnitt.proWoche).toBe(7_000)
    // 30 Tage sind rund 4,3 Wochen mal 40 Stunden.
    expect(a.schnitt.proStunde).toBe(Math.round(30_000 / ((30 / 7) * 40)))
    // Die Tabelle muss von Hand nachrechenbar bleiben: Monat mal zwoelf ist Jahr.
    expect(a.schnitt.proQuartal).toBe(a.schnitt.proMonat * 3)
    expect(a.schnitt.proJahr).toBe(a.schnitt.proMonat * 12)
  })

  it('zieht vom Netto weniger ab, als das Brutto ausmacht – und nie mehr', () => {
    const a = werteVerdienstAus([buchung(ausTeilen(2026, 9, 1, 10), 50_000)], profil, '30', JETZT)
    expect(a.schnittNetto.proMonat).toBeGreaterThan(0)
    expect(a.schnittNetto.proMonat).toBeLessThan(a.schnitt.proMonat)
    expect(a.netto.quote).toBeGreaterThan(0.4)
    expect(a.netto.quote).toBeLessThan(0.9)
  })

  it('kommt ohne Buchungen klar und meldet trotzdem eine sinnvolle Quote', () => {
    const a = werteVerdienstAus([], profil, '90', JETZT)
    expect(a.fenster.summeCents).toBe(0)
    expect(a.schnitt.proStunde).toBe(0)
    expect(a.besterTag).toBeNull()
    // Ohne Bezugsbetrag waere die Quote 0 – die Aussage "0 % bleiben uebrig"
    // waere falsch. Deshalb wird sie an einem Beispielbetrag bestimmt.
    expect(a.netto.quote).toBeGreaterThan(0.3)
  })

  it('gruppiert nach Kategorie und findet den besten Tag', () => {
    const a = werteVerdienstAus(
      [
        buchung(ausTeilen(2026, 9, 7, 9), 100),
        buchung(ausTeilen(2026, 9, 7, 10), 100),
        buchung(ausTeilen(2026, 9, 8, 9), 2_000, {
          kategorie: 'SALE_PRIVATE',
          bezeichnung: 'Max.1.000',
        }),
      ],
      profil,
      '30',
      JETZT,
    )
    expect(a.jeKategorie[0]?.kategorie).toBe('SALE_PRIVATE')
    expect(a.jeKategorie[0]?.summeCents).toBe(2_000)
    expect(a.top[0]?.bezeichnung).toBe('Max.1.000')
    expect(a.besterTag?.tag).toBe('2026-09-08')
    expect(a.fenster.buchungsTage).toBe(2)
  })

  it('haelt den Zwoelf-Monats-Verlauf in zeitlicher Reihenfolge', () => {
    const a = werteVerdienstAus(
      [
        buchung(ausTeilen(2026, 9, 1, 9), 100),
        buchung(ausTeilen(2026, 7, 1, 9), 100),
        buchung(ausTeilen(2026, 8, 1, 9), 100),
      ],
      profil,
      'alles',
      JETZT,
    )
    expect(a.verlauf.monat.map((m) => m.schluessel)).toEqual(['2026-07', '2026-08', '2026-09'])
  })
})

/**
 * Der Punkt, an dem sich die beiden Zuschnitte unterscheiden, ist der Stichtag:
 * eine Buchung vom 25. August steht im Kalendermonat August, aber schon im
 * Abrechnungszeitraum, der im September endet. Wer nur eine der beiden Zahlen
 * sieht, haelt sie fuer die andere – deshalb wird beides ausgewiesen.
 */
describe('Kalendermonat und Abrechnungszeitraum', () => {
  const buchungen = [
    buchung(ausTeilen(2026, 8, 19, 9), 100), // August, Abrechnung August
    buchung(ausTeilen(2026, 8, 25, 9), 100), // August, Abrechnung September
    buchung(ausTeilen(2026, 9, 5, 9), 100), // September, Abrechnung September
  ]

  it('zaehlt dieselben Buchungen in beiden Zuschnitten getrennt', () => {
    const a = werteVerdienstAus(buchungen, profil, 'alles', JETZT)

    expect(a.zeitraeume.monat.anzahl).toBe(1)
    expect(a.zeitraeume.monat.summeCents).toBe(100)
    expect(a.zeitraeume.periode.anzahl).toBe(2)
    expect(a.zeitraeume.periode.summeCents).toBe(200)
  })

  it('beschriftet beide laufenden Zeitraeume fertig fuer die Ansicht', () => {
    const a = werteVerdienstAus(buchungen, profil, 'alles', JETZT)

    expect(a.laufend.monat.spanne).toBe('01.09. – 30.09.2026')
    expect(a.laufend.periode.spanne).toBe('20.08. – 19.09.2026')
    expect(a.laufend.monat.name).toBe('September 2026')
    expect(a.laufend.periode.name).toBe('September 2026')
  })

  it('fuehrt den Verlauf in beiden Zuschnitten', () => {
    const a = werteVerdienstAus(buchungen, profil, 'alles', JETZT)

    expect(a.verlauf.monat.map((m) => [m.schluessel, m.anzahl])).toEqual([
      ['2026-08', 2],
      ['2026-09', 1],
    ])
    expect(a.verlauf.periode.map((m) => [m.schluessel, m.anzahl])).toEqual([
      ['2026-08', 1],
      ['2026-09', 2],
    ])
  })

  it('laesst eine Buchung ab dem Stichtag nicht mehr in den laufenden Zeitraum', () => {
    // Der 20.09. gehoert schon zur Abrechnung, die am 19.10. endet.
    const a = werteVerdienstAus(
      [...buchungen, buchung(ausTeilen(2026, 9, 20, 9), 100)],
      profil,
      'alles',
      ausTeilen(2026, 9, 21, 12),
    )
    expect(a.laufend.periode.schluessel).toBe('2026-10')
    expect(a.zeitraeume.periode.anzahl).toBe(1)
    // Im Kalendermonat September zaehlen die beiden September-Buchungen.
    expect(a.zeitraeume.monat.anzahl).toBe(2)
  })
})
