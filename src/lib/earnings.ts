import type { CommissionCategory, CommissionStatus } from '@prisma/client'
import { berechneAufschlag, type Steuerjahr, type Steuerklasse } from '@/lib/brutto-netto'
import {
  jahresBeginn,
  monatKurz,
  monatsBeginn,
  monatsSchluessel,
  quartalsBeginn,
  tagesBeginn,
  tagesEnde,
  tagesSchluessel,
  wochenBeginn,
} from '@/lib/time'

/**
 * Verdienst-Auswertung: aus einer Liste von Buchungen die Zahlen machen, die
 * im Vertrieb wirklich gefragt werden – pro Tag, pro Woche, pro Monat, pro
 * Quartal, pro Jahr und pro Stunde.
 *
 * Bewusst ohne Datenbank: die Abfrage laedt die Zeilen, dieses Modul rechnet.
 * So laesst sich jede Zahl testen, ohne einen Postgres zu starten, und die
 * Seite bekommt fertige Werte statt Zeitstempel zum Vergleichen.
 *
 * Stornierte Positionen (CLAWBACK) zaehlen nirgends zum Verdienst. Sie stehen
 * getrennt daneben, weil sie fuer den Abgleich am Monatsende wichtig sind.
 */

export type Buchung = {
  amountCents: number
  status: CommissionStatus
  occurredAt: Date
  kategorie: CommissionCategory | null
  bezeichnung: string
}

export type Arbeitsprofil = {
  wochenstunden: number
  arbeitstageProWoche: number
  grundgehaltCents: number
  steuerklasse: Steuerklasse
  kirchensteuerProzent: number
  kinderfreibetraege: number
  kinder: number
  kvZusatzBp: number
  steuerjahr: Steuerjahr
}

export type Fenster = '30' | '90' | 'jahr' | 'alles'

export const FENSTER_LABEL: Record<Fenster, string> = {
  '30': 'letzte 30 Tage',
  '90': 'letzte 90 Tage',
  jahr: 'laufendes Jahr',
  alles: 'gesamter Zeitraum',
}

const TAG_MS = 86_400_000
/** Durchschnittliche Monatslaenge – 365,25 / 12. */
const TAGE_JE_MONAT = 30.4375

export type Summe = { summeCents: number; anzahl: number }

export type VerdienstAuswertung = {
  zeitraeume: {
    heute: Summe
    woche: Summe
    monat: Summe
    quartal: Summe
    jahr: Summe
    gesamt: Summe
  }
  fenster: {
    art: Fenster
    von: Date
    bis: Date
    kalenderTage: number
    arbeitstage: number
    stunden: number
    /** Tage, an denen tatsaechlich gebucht wurde. */
    buchungsTage: number
    summeCents: number
    anzahl: number
    stornoCents: number
    stornoAnzahl: number
  }
  schnitt: {
    proStunde: number
    proArbeitstag: number
    proBuchungstag: number
    proKalendertag: number
    proWoche: number
    proMonat: number
    proQuartal: number
    proJahr: number
  }
  /** Derselbe Schnitt nach Steuern und Sozialabgaben. */
  schnittNetto: {
    proStunde: number
    proArbeitstag: number
    proBuchungstag: number
    proKalendertag: number
    proWoche: number
    proMonat: number
    proQuartal: number
    proJahr: number
  }
  netto: {
    quote: number
    monatBruttoCents: number
    monatNettoCents: number
  }
  jeMonat: { schluessel: string; label: string; summeCents: number; anzahl: number }[]
  jeKategorie: { kategorie: CommissionCategory; summeCents: number; anzahl: number }[]
  top: { bezeichnung: string; summeCents: number; anzahl: number }[]
  besterTag: { tag: string; summeCents: number; anzahl: number } | null
}

function summiere(buchungen: Buchung[], von: Date, bis?: Date): Summe {
  let summeCents = 0
  let anzahl = 0
  for (const b of buchungen) {
    const t = b.occurredAt.getTime()
    if (t < von.getTime()) continue
    if (bis && t >= bis.getTime()) continue
    summeCents += b.amountCents
    anzahl++
  }
  return { summeCents, anzahl }
}

function fensterBeginn(art: Fenster, jetzt: Date, aelteste: Date | null) {
  if (art === 'jahr') return jahresBeginn(jetzt)
  if (art === 'alles') return aelteste ? tagesBeginn(aelteste) : jahresBeginn(jetzt)
  return tagesBeginn(new Date(jetzt.getTime() - (Number(art) - 1) * TAG_MS))
}

export function werteVerdienstAus(
  alle: Buchung[],
  profil: Arbeitsprofil,
  art: Fenster,
  jetzt: Date,
): VerdienstAuswertung {
  // Storno zaehlt nicht zum Verdienst, wird aber getrennt ausgewiesen.
  const verdient = alle.filter((b) => b.status !== 'CLAWBACK')
  const storniert = alle.filter((b) => b.status === 'CLAWBACK')

  const aelteste = verdient.reduce<Date | null>(
    (a, b) => (a === null || b.occurredAt < a ? b.occurredAt : a),
    null,
  )

  const von = fensterBeginn(art, jetzt, aelteste)
  const bis = tagesEnde(jetzt)
  const kalenderTage = Math.max(1, Math.round((bis.getTime() - von.getTime()) / TAG_MS))
  const wochen = kalenderTage / 7
  const arbeitstage = Math.max(1, wochen * profil.arbeitstageProWoche)
  const stunden = Math.max(1, wochen * profil.wochenstunden)

  const imFenster = verdient.filter((b) => b.occurredAt >= von && b.occurredAt < bis)
  const summeCents = imFenster.reduce((s, b) => s + b.amountCents, 0)
  const stornoImFenster = storniert.filter((b) => b.occurredAt >= von && b.occurredAt < bis)

  const jeTag = new Map<string, Summe>()
  for (const b of imFenster) {
    const key = tagesSchluessel(b.occurredAt)
    const eintrag = jeTag.get(key) ?? { summeCents: 0, anzahl: 0 }
    eintrag.summeCents += b.amountCents
    eintrag.anzahl++
    jeTag.set(key, eintrag)
  }
  const buchungsTage = Math.max(1, jeTag.size)

  // Die Nettoquote haengt am Monatsvolumen: der Grenzsteuersatz auf den letzten
  // Euro ist ein anderer als der Durchschnittssatz. Deshalb wird sie einmal auf
  // den hochgerechneten Monatsbetrag bestimmt und dann auf alle Schnitte gelegt.
  const proMonat = (summeCents / kalenderTage) * TAGE_JE_MONAT
  // Ohne Buchungen waere die Quote 0 und die Aussage "0 % bleiben uebrig" falsch.
  // Dann wird sie an einem Beispielbetrag von 100 Euro bestimmt; die Netto-Spalte
  // bleibt trotzdem bei null, weil sie mit der Quote multipliziert wird.
  const bezugCents = Math.round(proMonat) || 10_000
  const aufschlag = berechneAufschlag({
    grundgehaltCents: profil.grundgehaltCents,
    provisionCents: bezugCents,
    steuerklasse: profil.steuerklasse,
    kirchensteuerProzent: profil.kirchensteuerProzent,
    kinderfreibetraege: profil.kinderfreibetraege,
    kinder: profil.kinder,
    kvZusatzBp: profil.kvZusatzBp,
    jahr: profil.steuerjahr,
  })
  const quote = aufschlag.nettoQuote

  // Quartal und Jahr rechnen auf dem GERUNDETEN Monatswert weiter. Ein paar
  // Cent Genauigkeit sind weniger wert als eine Tabelle, in der "pro Monat mal
  // zwoelf" auch wirklich "pro Jahr" ergibt – danach rechnet jeder von Hand nach.
  const proMonatGerundet = Math.round(proMonat)
  const schnitt = {
    proStunde: Math.round(summeCents / stunden),
    proArbeitstag: Math.round(summeCents / arbeitstage),
    proBuchungstag: Math.round(summeCents / buchungsTage),
    proKalendertag: Math.round(summeCents / kalenderTage),
    proWoche: Math.round(summeCents / wochen),
    proMonat: proMonatGerundet,
    proQuartal: proMonatGerundet * 3,
    proJahr: proMonatGerundet * 12,
  }
  const schnittNetto = Object.fromEntries(
    Object.entries(schnitt).map(([k, v]) => [k, Math.round(v * quote)]),
  ) as VerdienstAuswertung['schnittNetto']

  // Zwoelf Monate Verlauf, aelteste zuerst – so liest sich die Balkenreihe.
  const jeMonatMap = new Map<string, Summe>()
  const verlaufVon = monatsBeginn(new Date(jetzt.getTime() - 334 * TAG_MS))
  for (const b of verdient) {
    if (b.occurredAt < verlaufVon) continue
    const key = monatsSchluessel(b.occurredAt)
    const eintrag = jeMonatMap.get(key) ?? { summeCents: 0, anzahl: 0 }
    eintrag.summeCents += b.amountCents
    eintrag.anzahl++
    jeMonatMap.set(key, eintrag)
  }
  const jeMonat = [...jeMonatMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([schluessel, wert]) => ({ schluessel, label: monatKurz(schluessel), ...wert }))

  const jeKategorieMap = new Map<CommissionCategory, Summe>()
  for (const b of imFenster) {
    if (!b.kategorie) continue
    const eintrag = jeKategorieMap.get(b.kategorie) ?? { summeCents: 0, anzahl: 0 }
    eintrag.summeCents += b.amountCents
    eintrag.anzahl++
    jeKategorieMap.set(b.kategorie, eintrag)
  }

  const topMap = new Map<string, Summe>()
  for (const b of imFenster) {
    const eintrag = topMap.get(b.bezeichnung) ?? { summeCents: 0, anzahl: 0 }
    eintrag.summeCents += b.amountCents
    eintrag.anzahl++
    topMap.set(b.bezeichnung, eintrag)
  }

  const besterTagEintrag = [...jeTag.entries()].sort(
    ([, a], [, b]) => b.summeCents - a.summeCents,
  )[0]

  return {
    zeitraeume: {
      heute: summiere(verdient, tagesBeginn(jetzt)),
      woche: summiere(verdient, wochenBeginn(jetzt)),
      monat: summiere(verdient, monatsBeginn(jetzt)),
      quartal: summiere(verdient, quartalsBeginn(jetzt)),
      jahr: summiere(verdient, jahresBeginn(jetzt)),
      gesamt: {
        summeCents: verdient.reduce((s, b) => s + b.amountCents, 0),
        anzahl: verdient.length,
      },
    },
    fenster: {
      art,
      von,
      bis,
      kalenderTage,
      arbeitstage: Math.round(arbeitstage),
      stunden: Math.round(stunden),
      buchungsTage: jeTag.size,
      summeCents,
      anzahl: imFenster.length,
      stornoCents: stornoImFenster.reduce((s, b) => s + b.amountCents, 0),
      stornoAnzahl: stornoImFenster.length,
    },
    schnitt,
    schnittNetto,
    netto: {
      quote,
      monatBruttoCents: Math.round(proMonat),
      monatNettoCents: schnittNetto.proMonat,
    },
    jeMonat,
    jeKategorie: [...jeKategorieMap.entries()]
      .map(([kategorie, wert]) => ({ kategorie, ...wert }))
      .sort((a, b) => b.summeCents - a.summeCents),
    top: [...topMap.entries()]
      .map(([bezeichnung, wert]) => ({ bezeichnung, ...wert }))
      .sort((a, b) => b.summeCents - a.summeCents)
      .slice(0, 8),
    besterTag: besterTagEintrag ? { tag: besterTagEintrag[0], ...besterTagEintrag[1] } : null,
  }
}
