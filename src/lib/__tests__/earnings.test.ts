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
    expect(a.jeMonat.map((m) => m.schluessel)).toEqual(['2026-07', '2026-08', '2026-09'])
  })
})
