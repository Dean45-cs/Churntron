import { describe, expect, it } from 'vitest'
import {
  STEUERJAHRE,
  STEUERKLASSEN,
  berechneAufschlag,
  berechneNetto,
  einkommensteuer,
  type NettoEingabe,
  type Steuerjahr,
} from '@/lib/brutto-netto'

/**
 * Der Rechner ist eine Schaetzung – deshalb pruefen diese Tests nicht auf den
 * Cent genau gegen eine Lohnabrechnung, sondern die Eigenschaften, an denen ein
 * falscher Tarifwert oder ein vertauschtes Vorzeichen auffliegt:
 * Stetigkeit an den Zonengrenzen, Monotonie, Deckelung an den
 * Beitragsbemessungsgrenzen und ein Netto in plausibler Groessenordnung.
 */

const basis: Omit<NettoEingabe, 'monatsBruttoCents'> = {
  steuerklasse: 1,
  kirchensteuerProzent: 0,
  kinderfreibetraege: 0,
  kinder: 0,
  kvZusatzBp: 290,
  jahr: 2026,
}

describe('Einkommensteuertarif §32a', () => {
  it.each(STEUERJAHRE)('nimmt im Grundfreibetrag nichts (%s)', (jahr) => {
    expect(einkommensteuer(10_000, jahr)).toBe(0)
    expect(einkommensteuer(0, jahr)).toBe(0)
  })

  it.each(STEUERJAHRE)('laeuft an den Zonengrenzen stetig weiter (%s)', (jahr) => {
    // Ein Tippfehler in einem der Tarifkoeffizienten erzeugt hier einen Sprung.
    for (const grenze of [12_348, 17_799, 17_443, 12_096, 69_878, 68_480]) {
      const links = einkommensteuer(grenze, jahr)
      const rechts = einkommensteuer(grenze + 1, jahr)
      expect(rechts - links).toBeLessThan(2)
      expect(rechts - links).toBeGreaterThanOrEqual(0)
    }
  })

  it.each(STEUERJAHRE)('steigt streng monoton (%s)', (jahr) => {
    let vorher = -1
    for (let euro = 12_000; euro < 300_000; euro += 2_500) {
      const jetzt = einkommensteuer(euro, jahr)
      expect(jetzt).toBeGreaterThanOrEqual(vorher)
      vorher = jetzt
    }
  })

  it('bleibt unter dem Spitzensteuersatz', () => {
    for (const euro of [20_000, 60_000, 120_000, 400_000]) {
      expect(einkommensteuer(euro, 2026) / euro).toBeLessThan(0.45)
    }
  })

  it('entlastet 2026 gegenueber 2025 bei gleichem Einkommen', () => {
    // Der Grundfreibetrag steigt, die Eckwerte wandern nach rechts.
    expect(einkommensteuer(45_000, 2026)).toBeLessThan(einkommensteuer(45_000, 2025))
  })
})

describe('Netto aus Brutto', () => {
  it('liegt bei 3.000 Euro Steuerklasse I in plausibler Groessenordnung', () => {
    const r = berechneNetto({ ...basis, monatsBruttoCents: 300_000 })
    // Ueblich sind rund 2.000 bis 2.100 Euro netto.
    expect(r.nettoCents).toBeGreaterThan(190_000)
    expect(r.nettoCents).toBeLessThan(220_000)
    expect(r.abzuegeCents + r.nettoCents).toBe(r.bruttoCents)
  })

  it('laesst in Klasse III mehr uebrig als in Klasse I, in V weniger', () => {
    const netto = (steuerklasse: NettoEingabe['steuerklasse']) =>
      berechneNetto({ ...basis, steuerklasse, monatsBruttoCents: 300_000 }).nettoCents
    expect(netto(3)).toBeGreaterThan(netto(1))
    expect(netto(5)).toBeLessThan(netto(1))
    expect(netto(6)).toBeLessThan(netto(1))
  })

  it('zieht Kirchensteuer zusaetzlich ab', () => {
    const ohne = berechneNetto({ ...basis, monatsBruttoCents: 300_000 })
    const mit = berechneNetto({ ...basis, kirchensteuerProzent: 9, monatsBruttoCents: 300_000 })
    expect(mit.kirchensteuerCents).toBeGreaterThan(0)
    expect(mit.nettoCents).toBeLessThan(ohne.nettoCents)
  })

  it('nimmt Kinderlosen mehr Pflegeversicherung ab', () => {
    const kinderlos = berechneNetto({ ...basis, monatsBruttoCents: 300_000 })
    const zweiKinder = berechneNetto({ ...basis, kinder: 2, monatsBruttoCents: 300_000 })
    expect(zweiKinder.pvCents).toBeLessThan(kinderlos.pvCents)
  })

  it('deckelt die Sozialabgaben an der Beitragsbemessungsgrenze', () => {
    const hoch = berechneNetto({ ...basis, monatsBruttoCents: 1_500_000 })
    const sehrHoch = berechneNetto({ ...basis, monatsBruttoCents: 3_000_000 })
    expect(sehrHoch.kvCents).toBe(hoch.kvCents)
    expect(sehrHoch.rvCents).toBe(hoch.rvCents)
  })

  it.each(STEUERKLASSEN)('laesst in Klasse %s nie mehr als das Brutto uebrig', (steuerklasse) => {
    for (const brutto of [0, 50_000, 150_000, 450_000, 900_000]) {
      const r = berechneNetto({ ...basis, steuerklasse, monatsBruttoCents: brutto })
      expect(r.nettoCents).toBeLessThanOrEqual(brutto)
      expect(r.nettoCents).toBeGreaterThanOrEqual(0)
    }
  })

  it('nimmt bei 0 Euro Brutto auch nichts weg', () => {
    const r = berechneNetto({ ...basis, monatsBruttoCents: 0 })
    expect(r.nettoCents).toBe(0)
    expect(r.abzuegeCents).toBe(0)
  })
})

describe('Aufschlag der Provision', () => {
  const eingabe = {
    ...basis,
    grundgehaltCents: 250_000,
    provisionCents: 15_000,
  }

  it('laesst von 150 Euro Provision einen Teil uebrig', () => {
    const r = berechneAufschlag(eingabe)
    expect(r.provisionNettoCents).toBeGreaterThan(0)
    expect(r.provisionNettoCents).toBeLessThan(r.provisionBruttoCents)
    // Auf einem normalen Gehalt bleiben rund die Haelfte bis zwei Drittel.
    expect(r.nettoQuote).toBeGreaterThan(0.4)
    expect(r.nettoQuote).toBeLessThan(0.8)
  })

  it('rechnet den Grenzsatz und nicht den Durchschnitt', () => {
    // Vom letzten Euro bleibt weniger als vom ersten – sonst waere schlicht der
    // Durchschnittssatz auf die Provision gelegt worden.
    const r = berechneAufschlag(eingabe)
    expect(r.nettoQuote).toBeLessThan(1 - r.ohne.abzugsQuote + 0.02)
  })

  it('meldet bei 0 Euro Provision eine Quote von 0 statt NaN', () => {
    const r = berechneAufschlag({ ...eingabe, provisionCents: 0 })
    expect(r.nettoQuote).toBe(0)
    expect(r.provisionNettoCents).toBe(0)
  })

  it('waechst mit der Provision', () => {
    let vorher = -1
    for (const provisionCents of [0, 5_000, 20_000, 80_000, 200_000]) {
      const r = berechneAufschlag({ ...eingabe, provisionCents })
      expect(r.provisionNettoCents).toBeGreaterThan(vorher)
      vorher = r.provisionNettoCents
    }
  })

  it.each([2025, 2026] as Steuerjahr[])('rechnet auch fuer %s', (jahr) => {
    expect(berechneAufschlag({ ...eingabe, jahr }).provisionNettoCents).toBeGreaterThan(0)
  })
})
