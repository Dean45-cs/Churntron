import type {
  ActivityOutcome,
  ActivityType,
  CommissionCategory,
  CommissionStatus,
  DuelMetric,
  DuelMode,
  DuelStatus,
} from '@prisma/client'
import { periodeVon, periodenZeitraum } from '@/lib/period'
import { tagesBeginn, tagesEnde, wochenBeginn, plusTage } from '@/lib/time'
import { formatEuro, formatZahl } from '@/lib/utils'

/**
 * Duelle: 1 gegen 1 und 2 gegen 2 zwischen Kolleginnen und Kollegen.
 *
 * Zwei Entscheidungen tragen das ganze Modul:
 *
 * 1. **Ein Duell verlangt keine Zusatzerfassung.** Jede Metrik wird aus Daten
 *    gerechnet, die im Alltag ohnehin entstehen – Provisionsbuchungen,
 *    Churn-Aktivitaeten, Punkte. Wer ein Duell laeuft, arbeitet einfach weiter.
 *
 * 2. **Der Punktestand wird nicht gespeichert, sondern gerechnet.** Es gibt
 *    keine Spalte "Punkte" und keinen Zaehler, der beim Buchen mitlaeuft. Wird
 *    eine Buchung nachtraeglich storniert, faellt sie auch aus dem Duell
 *    heraus. Gewonnen hat, wer wirklich geliefert hat – und nicht, wer zuerst
 *    einen Zaehler hochgetreten hat.
 *
 * Wie in earnings.ts steht hier reine Rechnung: die Abfrage laedt die Zeilen,
 * dieses Modul wertet sie aus. So laesst sich jede Zahl testen, ohne einen
 * Postgres zu starten.
 */

/** Was im Katalog als Vertragsabschluss zaehlt – Grundlage der Metrik SALES. */
export const ABSCHLUSS_KATEGORIEN: readonly CommissionCategory[] = ['SALE_PRIVATE', 'SALE_BUSINESS']

/** Wie viele je Seite antreten. Mehr als 2 ist keine Frage der Anzeige, sondern des Modus. */
export const SEITEN_GROESSE: Record<DuelMode, number> = { ONE_VS_ONE: 1, TWO_VS_TWO: 2 }

export type MetrikInfo = {
  /** Euro-Betraege werden ueber formatEuro angezeigt, alles andere als Stueckzahl. */
  einheit: 'euro' | 'anzahl'
  /** Die Frage, um die gespielt wird – steht so im Auswahlformular. */
  frage: string
  /** Woher die Zahl kommt. Gehoert sichtbar in die Oberflaeche: wer spielt, soll wissen, was zaehlt. */
  quelle: string
}

export const METRIK_INFO: Record<DuelMetric, MetrikInfo> = {
  COMMISSION_CENTS: {
    einheit: 'euro',
    frage: 'Wer macht mehr Provision?',
    quelle: 'Summe der gebuchten Provision im Zeitraum, ohne Storno.',
  },
  BOOKINGS: {
    einheit: 'anzahl',
    frage: 'Wer bucht mehr Vorgänge?',
    quelle: 'Anzahl der Buchungen im Tracker, ohne Storno.',
  },
  SALES: {
    einheit: 'anzahl',
    frage: 'Wer macht mehr Abschlüsse?',
    quelle: 'Buchungen aus Vertragsabschluss Privat und Business, ohne Storno.',
  },
  CHURN_SAVED: {
    einheit: 'anzahl',
    frage: 'Wer holt mehr zurück?',
    quelle: 'Churn-Aktivitäten mit dem Ergebnis „Gewonnen".',
  },
  CALLS: {
    einheit: 'anzahl',
    frage: 'Wer führt mehr Gespräche?',
    quelle: 'Erfasste Anrufe im Churn-Modul.',
  },
  POINTS: {
    einheit: 'anzahl',
    frage: 'Wer sammelt mehr Punkte?',
    quelle: 'Punkte aus den Challenges.',
  },
}

/** Ein Metrikwert als Text – Euro mit Waehrung, alles andere als blanke Zahl. */
export function formatMetrik(metrik: DuelMetric, wert: number) {
  return METRIK_INFO[metrik].einheit === 'euro' ? formatEuro(wert) : formatZahl(wert)
}

// --- Zeitraum --------------------------------------------------------------

/**
 * Die drei Zuschnitte, die im Vertrieb tatsaechlich gefragt werden. Alle drei
 * laufen ueber time.ts bzw. period.ts – nie ueber die Serverzeit, sonst faengt
 * das Tagesduell um 02:00 deutscher Zeit am Vortag an.
 */
export type ZeitraumVorlage = 'HEUTE' | 'WOCHE' | 'PERIODE'

export const ZEITRAUM_LABEL: Record<ZeitraumVorlage, string> = {
  HEUTE: 'Heute',
  WOCHE: 'Diese Woche',
  PERIODE: 'Laufende Periode',
}

export function vorlagenZeitraum(vorlage: ZeitraumVorlage, jetzt: Date): { von: Date; bis: Date } {
  if (vorlage === 'HEUTE') return { von: tagesBeginn(jetzt), bis: tagesEnde(jetzt) }
  if (vorlage === 'WOCHE') {
    const von = wochenBeginn(jetzt)
    return { von, bis: plusTage(von, 7) }
  }
  return periodenZeitraum(periodeVon(jetzt))
}

// --- Phase -----------------------------------------------------------------

/**
 * Was mit dem Duell gerade los ist. Bewusst aus Status UND Uhrzeit abgeleitet
 * statt allein aus der Statusspalte: ein Duell endet, wenn sein Zeitfenster
 * zu ist, und nicht erst, wenn jemand einen Knopf drueckt.
 */
export type DuellPhase = 'EINLADUNG' | 'LAEUFT' | 'BEENDET' | 'ABGELEHNT' | 'ABGESAGT' | 'VERFALLEN'

export function phaseVon(status: DuelStatus, endsAt: Date, jetzt: Date): DuellPhase {
  if (status === 'DECLINED') return 'ABGELEHNT'
  if (status === 'CANCELLED') return 'ABGESAGT'
  const vorbei = endsAt.getTime() <= jetzt.getTime()
  // Eine Einladung, die niemand beantwortet hat, bis das Fenster zu war.
  if (status === 'OPEN') return vorbei ? 'VERFALLEN' : 'EINLADUNG'
  return vorbei ? 'BEENDET' : 'LAEUFT'
}

/** Zaehlt eine Phase noch – also lohnt es sich, den Stand zu rechnen? */
export function phaseLebt(phase: DuellPhase) {
  return phase === 'EINLADUNG' || phase === 'LAEUFT' || phase === 'BEENDET'
}

// --- Punktestand aus den Rohdaten ------------------------------------------

export type ProvisionsZeile = {
  userId: string
  occurredAt: Date
  amountCents: number
  status: CommissionStatus
  kategorie: CommissionCategory | null
}

export type AktivitaetsZeile = {
  userId: string
  occurredAt: Date
  typ: ActivityType
  ergebnis: ActivityOutcome | null
}

export type PunkteZeile = { userId: string; occurredAt: Date; punkte: number }

/**
 * Die Zeilen, aus denen sich jede Metrik rechnen laesst. Die Abfrage laedt sie
 * einmal fuer alle Duelle einer Seite – so kostet eine Liste mit zwoelf
 * Duellen drei Abfragen und nicht sechsunddreissig.
 */
export type Rohdaten = {
  provisionen: ProvisionsZeile[]
  aktivitaeten: AktivitaetsZeile[]
  punkte: PunkteZeile[]
}

export const LEERE_ROHDATEN: Rohdaten = { provisionen: [], aktivitaeten: [], punkte: [] }

/**
 * Der Punktestand je Teilnehmer.
 *
 * Das Fenster ist unten einschliessend und oben ausschliessend – genauso, wie
 * tagesEnde() gedacht ist. Sonst zaehlte eine Buchung um Punkt Mitternacht in
 * zwei Tagesduelle.
 */
export function punkteJeTeilnehmer(
  metrik: DuelMetric,
  userIds: string[],
  von: Date,
  bis: Date,
  roh: Rohdaten,
): Record<string, number> {
  const stand: Record<string, number> = {}
  for (const id of userIds) stand[id] = 0

  const zaehlt = (userId: string, d: Date) =>
    stand[userId] !== undefined && d.getTime() >= von.getTime() && d.getTime() < bis.getTime()
  const plus = (userId: string, wert: number) => {
    stand[userId] = (stand[userId] ?? 0) + wert
  }

  switch (metrik) {
    case 'COMMISSION_CENTS':
    case 'BOOKINGS':
    case 'SALES':
      for (const z of roh.provisionen) {
        // Storno zaehlt nirgends – im Verdienst nicht und im Duell auch nicht.
        if (z.status === 'CLAWBACK') continue
        if (!zaehlt(z.userId, z.occurredAt)) continue
        if (metrik === 'COMMISSION_CENTS') plus(z.userId, z.amountCents)
        else if (metrik === 'BOOKINGS') plus(z.userId, 1)
        else if (z.kategorie && ABSCHLUSS_KATEGORIEN.includes(z.kategorie)) plus(z.userId, 1)
      }
      break

    case 'CHURN_SAVED':
    case 'CALLS':
      for (const z of roh.aktivitaeten) {
        if (!zaehlt(z.userId, z.occurredAt)) continue
        if (metrik === 'CHURN_SAVED' ? z.ergebnis === 'WON' : z.typ === 'CALL') plus(z.userId, 1)
      }
      break

    case 'POINTS':
      for (const z of roh.punkte) {
        if (!zaehlt(z.userId, z.occurredAt)) continue
        plus(z.userId, z.punkte)
      }
      break
  }

  return stand
}

// --- Auswertung ------------------------------------------------------------

export type DuellMitglied = { userId: string; name: string; wert: number; angenommen: boolean }

export type DuellSeite = {
  seite: number
  wert: number
  /** Anteil am Gesamtwert in Prozent – die beiden Seiten ergeben zusammen 100. */
  anteil: number
  fuehrt: boolean
  mitglieder: DuellMitglied[]
}

export type DuellStand = {
  /** Immer nach Seitennummer sortiert, damit die Anzeige nicht springt. */
  seiten: DuellSeite[]
  unentschieden: boolean
  /** Abstand zwischen fuehrender und zweiter Seite, in der Einheit der Metrik. */
  vorsprung: number
  /** Erst gesetzt, wenn das Duell durch ist. Vorher fuehrt jemand, gewonnen hat niemand. */
  gewinnerSeite: number | null
  /** Fortschritt der fuehrenden Seite zum Zielwert, falls einer gesetzt ist. */
  zielProzent: number | null
  zielErreicht: boolean
}

export type TeilnehmerEingabe = {
  userId: string
  name: string
  seite: number
  angenommen: boolean
}

/**
 * Aus Teilnehmern und ihren Werten den Stand machen.
 *
 * Der Anteil traegt den Balken, der die beiden Seiten gegeneinander zeigt.
 * Bei 0 zu 0 stehen beide auf 50 – ein Balken, der ganz auf eine Seite kippt,
 * bevor ueberhaupt etwas passiert ist, waere schlicht gelogen.
 */
export function werteDuellAus(input: {
  teilnehmer: TeilnehmerEingabe[]
  werte: Record<string, number>
  target: number | null
  beendet: boolean
}): DuellStand {
  const { teilnehmer, werte, target, beendet } = input

  const nummern = [...new Set(teilnehmer.map((t) => t.seite))].sort((a, b) => a - b)
  const roh = nummern.map((seite) => {
    const mitglieder = teilnehmer
      .filter((t) => t.seite === seite)
      .map((t) => ({
        userId: t.userId,
        name: t.name,
        wert: werte[t.userId] ?? 0,
        angenommen: t.angenommen,
      }))
    return { seite, mitglieder, wert: mitglieder.reduce((s, m) => s + m.wert, 0) }
  })

  const gesamt = roh.reduce((s, r) => s + r.wert, 0)
  const hoechster = Math.max(0, ...roh.map((r) => r.wert))
  const fuehrende = roh.filter((r) => r.wert === hoechster)
  const unentschieden = fuehrende.length !== 1
  const zweiter = Math.max(0, ...roh.filter((r) => r.wert < hoechster).map((r) => r.wert))

  const seiten: DuellSeite[] = roh.map((r, i) => ({
    ...r,
    // Die zweite Seite bekommt den Rest, damit die beiden Anteile exakt 100
    // ergeben und der Balken keine Fuge hat.
    anteil:
      gesamt === 0
        ? Math.round(100 / roh.length)
        : i === roh.length - 1
          ? 100 - roh.slice(0, i).reduce((s, x) => s + Math.round((x.wert / gesamt) * 100), 0)
          : Math.round((r.wert / gesamt) * 100),
    fuehrt: !unentschieden && r.wert === hoechster,
  }))

  return {
    seiten,
    unentschieden,
    vorsprung: unentschieden ? 0 : hoechster - zweiter,
    gewinnerSeite: beendet && !unentschieden ? (fuehrende[0]?.seite ?? null) : null,
    zielProzent:
      target && target > 0 ? Math.min(100, Math.round((hoechster / target) * 100)) : null,
    zielErreicht: target !== null && target > 0 && hoechster >= target,
  }
}

// --- Bilanz ----------------------------------------------------------------

export type Bilanz = { siege: number; niederlagen: number; unentschieden: number }

/**
 * Die eigene Duell-Bilanz aus beendeten Duellen. Offene zaehlen nicht mit, und
 * Duelle, bei denen man nur zugeschaut hat, auch nicht.
 */
export function bilanzAus(
  duelle: {
    phase: DuellPhase
    meineSeite: number | null
    unentschieden: boolean
    gewinnerSeite: number | null
  }[],
): Bilanz {
  const bilanz: Bilanz = { siege: 0, niederlagen: 0, unentschieden: 0 }
  for (const d of duelle) {
    if (d.phase !== 'BEENDET' || d.meineSeite === null) continue
    if (d.unentschieden) bilanz.unentschieden++
    else if (d.gewinnerSeite === d.meineSeite) bilanz.siege++
    else bilanz.niederlagen++
  }
  return bilanz
}
