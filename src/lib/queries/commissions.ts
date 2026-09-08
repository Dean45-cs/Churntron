import type { CommissionCategory, CommissionStatus, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { werteVerdienstAus, type Arbeitsprofil, type Buchung, type Fenster } from '@/lib/earnings'
import type { Steuerjahr, Steuerklasse } from '@/lib/brutto-netto'
import {
  auszahlungsTag,
  letztePerioden,
  periodeAbgeschlossen,
  periodenFortschritt,
  periodenLabel,
  periodenName,
  periodeVon,
} from '@/lib/period'
import { tagesBeginn, tagesEnde, tagesSchluessel, wochenBeginn } from '@/lib/time'
import { formatDate } from '@/lib/utils'

/**
 * Abfragen des Provisionsmoduls.
 *
 * Dieselbe Regel wie in queries/index.ts: hier stehen die Zeitbezuege, die
 * Seiten bekommen fertige Werte. `new Date()` gehoert nicht in den Render-Pfad.
 */

/** Buchungen ohne Storno – Storno zaehlt nirgends zum Verdienst. */
const OHNE_STORNO: Prisma.CommissionWhereInput = { status: { not: 'CLAWBACK' } }

// --- Katalog ---------------------------------------------------------------

export type KatalogEintrag = {
  id: string
  key: string
  name: string
  variant: string | null
  hint: string | null
  amountCents: number
  category: CommissionCategory
}

export type KatalogGruppe = { kategorie: CommissionCategory; eintraege: KatalogEintrag[] }

/** Der Katalog, nach Abschnitten gruppiert – Grundlage der Tracker-Tasten. */
export async function getKatalog(): Promise<KatalogGruppe[]> {
  const regeln = await db.commissionRule.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      key: true,
      name: true,
      variant: true,
      hint: true,
      amountCents: true,
      category: true,
    },
  })

  const reihenfolge: CommissionCategory[] = [
    'CAMPAIGN',
    'SALE_PRIVATE',
    'SALE_BUSINESS',
    'ADDON',
    'TARIFF_CHANGE',
  ]
  return reihenfolge
    .map((kategorie) => ({
      kategorie,
      eintraege: regeln
        .filter((r) => r.category === kategorie)
        .map((r) => ({ ...r, amountCents: r.amountCents ?? 0 })),
    }))
    .filter((g) => g.eintraege.length > 0)
}

// --- Tracker ---------------------------------------------------------------

export type TrackerBuchung = {
  id: string
  bezeichnung: string
  amountCents: number
  status: CommissionStatus
  externalRef: string | null
  uhrzeit: string
  note: string | null
}

export type TrackerStand = {
  heute: { summeCents: number; anzahl: number }
  woche: { summeCents: number; anzahl: number }
  periode: {
    schluessel: string
    summeCents: number
    anzahl: number
    offenCents: number
    restTage: number
    prozent: number
    /** Fertig formatiert: die Komponente soll kein Datum mehr anfassen muessen. */
    auszahlungAm: string
  }
  /** Wie oft heute schon gebucht – haengt als Zaehler an der Taste. */
  heuteJeRegel: Record<string, number>
  letzteBuchungen: TrackerBuchung[]
}

const UHRZEIT = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
})

const TAG_KURZ = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Berlin',
})

export async function getTrackerStand(userId: string): Promise<TrackerStand> {
  const jetzt = new Date()
  const heuteVon = tagesBeginn(jetzt)
  const heuteBis = tagesEnde(jetzt)
  const periode = periodeVon(jetzt)

  const [heute, woche, inPeriode, offen, heutigeZeilen, letzte] = await Promise.all([
    db.commission.aggregate({
      _sum: { amountCents: true },
      _count: true,
      where: { userId, ...OHNE_STORNO, occurredAt: { gte: heuteVon, lt: heuteBis } },
    }),
    db.commission.aggregate({
      _sum: { amountCents: true },
      _count: true,
      where: { userId, ...OHNE_STORNO, occurredAt: { gte: wochenBeginn(jetzt), lt: heuteBis } },
    }),
    db.commission.aggregate({
      _sum: { amountCents: true },
      _count: true,
      where: { userId, ...OHNE_STORNO, periodMonth: periode },
    }),
    db.commission.aggregate({
      _sum: { amountCents: true },
      where: { userId, status: { in: ['PENDING', 'APPROVED'] } },
    }),
    db.commission.findMany({
      where: { userId, occurredAt: { gte: heuteVon, lt: heuteBis } },
      select: { ruleId: true, rule: { select: { key: true } } },
    }),
    db.commission.findMany({
      where: { userId },
      // Zwei Buchungen in derselben Sekunde sollen nicht springen.
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        amountCents: true,
        status: true,
        externalRef: true,
        occurredAt: true,
        note: true,
        rule: { select: { name: true, variant: true } },
        contract: { select: { externalRef: true } },
      },
    }),
  ])

  const heuteJeRegel: Record<string, number> = {}
  for (const zeile of heutigeZeilen) {
    const key = zeile.rule?.key
    if (key) heuteJeRegel[key] = (heuteJeRegel[key] ?? 0) + 1
  }

  const fortschritt = periodenFortschritt(periode, jetzt)

  return {
    heute: { summeCents: heute._sum.amountCents ?? 0, anzahl: heute._count },
    woche: { summeCents: woche._sum.amountCents ?? 0, anzahl: woche._count },
    periode: {
      schluessel: periode,
      summeCents: inPeriode._sum.amountCents ?? 0,
      anzahl: inPeriode._count,
      offenCents: offen._sum.amountCents ?? 0,
      restTage: fortschritt.restTage,
      prozent: fortschritt.prozent,
      auszahlungAm: formatDate(auszahlungsTag(periode)),
    },
    heuteJeRegel,
    letzteBuchungen: letzte.map((b) => ({
      id: b.id,
      bezeichnung: bezeichne(b.rule),
      amountCents: b.amountCents,
      status: b.status,
      externalRef: b.externalRef ?? b.contract?.externalRef ?? null,
      uhrzeit: UHRZEIT.format(b.occurredAt),
      note: b.note,
    })),
  }
}

function bezeichne(rule: { name: string; variant: string | null } | null) {
  if (!rule) return 'Ohne Katalogeintrag'
  return rule.variant ? `${rule.name} · ${rule.variant}` : rule.name
}

// --- Einstellungen ---------------------------------------------------------

export const STANDARD_PROFIL: Arbeitsprofil = {
  wochenstunden: 40,
  arbeitstageProWoche: 5,
  grundgehaltCents: 0,
  steuerklasse: 1,
  kirchensteuerProzent: 0,
  kinderfreibetraege: 0,
  kinder: 0,
  kvZusatzBp: 290,
  steuerjahr: 2026,
}

export async function getArbeitsprofil(userId: string): Promise<Arbeitsprofil> {
  const s = await db.userSettings.findUnique({ where: { userId } })
  if (!s) return STANDARD_PROFIL
  return {
    wochenstunden: Number(s.weeklyHours),
    arbeitstageProWoche: s.workDaysPerWeek,
    grundgehaltCents: s.baseSalaryCents,
    steuerklasse: Math.min(6, Math.max(1, s.taxClass)) as Steuerklasse,
    kirchensteuerProzent: s.churchTaxPercent,
    kinderfreibetraege: Number(s.childAllowances),
    kinder: s.children,
    kvZusatzBp: s.healthExtraRateBp,
    steuerjahr: (s.taxYear === 2025 ? 2025 : 2026) as Steuerjahr,
  }
}

// --- Verdienst -------------------------------------------------------------

export async function getVerdienst(userId: string, fenster: Fenster) {
  const jetzt = new Date()
  // Fuer den Zwoelf-Monats-Verlauf wird immer ein Jahr geladen, auch wenn das
  // Auswertungsfenster kuerzer ist.
  const seit = new Date(jetzt.getTime() - 400 * 86_400_000)

  const [zeilen, profil] = await Promise.all([
    db.commission.findMany({
      where: { userId, occurredAt: { gte: fenster === 'alles' ? undefined : seit } },
      orderBy: { occurredAt: 'asc' },
      select: {
        amountCents: true,
        status: true,
        occurredAt: true,
        rule: { select: { name: true, variant: true, category: true } },
      },
    }),
    getArbeitsprofil(userId),
  ])

  const buchungen: Buchung[] = zeilen.map((z) => ({
    amountCents: z.amountCents,
    status: z.status,
    occurredAt: z.occurredAt,
    kategorie: z.rule?.category ?? null,
    bezeichnung: bezeichne(z.rule),
  }))

  return { auswertung: werteVerdienstAus(buchungen, profil, fenster, jetzt), profil }
}

// --- Abgleich der Auszahlungen ---------------------------------------------

export type PeriodenStand = {
  schluessel: string
  /** "September 2026" */
  name: string
  /** "20.08. – 19.09.2026" */
  zeitraum: string
  erwartetCents: number
  anzahl: number
  stornoCents: number
  offenCents: number
  ausgezahltCents: number | null
  differenzCents: number | null
  bezahltAmText: string | null
  /** Dasselbe Datum als Wert fuer ein <input type="date">. */
  bezahltAmWert: string | null
  notiz: string | null
  abgeschlossen: boolean
  auszahlungAmText: string
  /** Positionen, die noch nicht auf "ausgezahlt" stehen. */
  offenAnzahl: number
}

export async function getPeriodenStaende(userId: string, anzahl = 6): Promise<PeriodenStand[]> {
  const jetzt = new Date()
  const perioden = letztePerioden(periodeVon(jetzt), anzahl)

  const [gruppen, auszahlungen] = await Promise.all([
    db.commission.groupBy({
      by: ['periodMonth', 'status'],
      where: { userId, periodMonth: { in: perioden } },
      _sum: { amountCents: true },
      _count: true,
    }),
    db.commissionPayout.findMany({ where: { userId, periodKey: { in: perioden } } }),
  ])

  return perioden.map((schluessel) => {
    const zeilen = gruppen.filter((g) => g.periodMonth === schluessel)
    const summeVon = (status: CommissionStatus[]) =>
      zeilen
        .filter((z) => status.includes(z.status))
        .reduce((s, z) => s + (z._sum.amountCents ?? 0), 0)
    const anzahlVon = (status: CommissionStatus[]) =>
      zeilen.filter((z) => status.includes(z.status)).reduce((s, z) => s + z._count, 0)

    const erwartetCents = summeVon(['PENDING', 'APPROVED', 'PAID'])
    const auszahlung = auszahlungen.find((a) => a.periodKey === schluessel) ?? null

    return {
      schluessel,
      name: periodenName(schluessel),
      zeitraum: periodenLabel(schluessel),
      erwartetCents,
      anzahl: anzahlVon(['PENDING', 'APPROVED', 'PAID']),
      stornoCents: summeVon(['CLAWBACK']),
      offenCents: summeVon(['PENDING', 'APPROVED']),
      offenAnzahl: anzahlVon(['PENDING', 'APPROVED']),
      ausgezahltCents: auszahlung?.paidCents ?? null,
      differenzCents: auszahlung ? auszahlung.paidCents - erwartetCents : null,
      bezahltAmText: auszahlung?.paidOn ? formatDate(auszahlung.paidOn) : null,
      bezahltAmWert: auszahlung?.paidOn ? tagesSchluessel(auszahlung.paidOn) : null,
      notiz: auszahlung?.note ?? null,
      abgeschlossen: periodeAbgeschlossen(schluessel, jetzt),
      auszahlungAmText: formatDate(auszahlungsTag(schluessel)),
    }
  })
}

export type PeriodenPosition = {
  id: string
  bezeichnung: string
  amountCents: number
  status: CommissionStatus
  externalRef: string | null
  tagText: string
}

/** Die Einzelpositionen einer Periode – die Liste, die beim Abgleich durchgegangen wird. */
export async function getPeriodenPositionen(
  userId: string,
  periode: string,
): Promise<PeriodenPosition[]> {
  const zeilen = await db.commission.findMany({
    where: { userId, periodMonth: periode },
    orderBy: { occurredAt: 'asc' },
    select: {
      id: true,
      amountCents: true,
      status: true,
      externalRef: true,
      occurredAt: true,
      rule: { select: { name: true, variant: true } },
      contract: { select: { externalRef: true } },
    },
  })

  return zeilen.map((z) => ({
    id: z.id,
    bezeichnung: bezeichne(z.rule),
    amountCents: z.amountCents,
    status: z.status,
    externalRef: z.externalRef ?? z.contract?.externalRef ?? null,
    tagText: TAG_KURZ.format(z.occurredAt),
  }))
}

/**
 * Positionen einer Periode nach Katalogeintrag zusammengefasst. Beim Abgleich
 * sucht niemand eine einzelne von 140 Zeilen – gesucht wird die Gruppe, in der
 * die Stueckzahl nicht stimmt.
 */
export async function getPeriodenGruppen(userId: string, periode: string) {
  const zeilen = await db.commission.groupBy({
    by: ['ruleId', 'status'],
    where: { userId, periodMonth: periode },
    _sum: { amountCents: true },
    _count: true,
  })
  const regeln = await db.commissionRule.findMany({
    where: { id: { in: [...new Set(zeilen.map((z) => z.ruleId).filter(Boolean))] as string[] } },
    select: { id: true, name: true, variant: true, amountCents: true },
  })

  const gruppen = new Map<
    string,
    {
      bezeichnung: string
      satzCents: number
      anzahl: number
      summeCents: number
      stornoAnzahl: number
    }
  >()
  for (const z of zeilen) {
    const regel = regeln.find((r) => r.id === z.ruleId) ?? null
    const schluessel = z.ruleId ?? 'ohne'
    const eintrag = gruppen.get(schluessel) ?? {
      bezeichnung: bezeichne(regel),
      satzCents: regel?.amountCents ?? 0,
      anzahl: 0,
      summeCents: 0,
      stornoAnzahl: 0,
    }
    if (z.status === 'CLAWBACK') {
      eintrag.stornoAnzahl += z._count
    } else {
      eintrag.anzahl += z._count
      eintrag.summeCents += z._sum.amountCents ?? 0
    }
    gruppen.set(schluessel, eintrag)
  }

  return [...gruppen.values()].sort((a, b) => b.summeCents - a.summeCents)
}

// --- Kennzahlen und Team ---------------------------------------------------

/**
 * Die vier Status als Summe. Sie bleiben die Klammer um das Modul: eine Buchung
 * ist offen, genehmigt, ausgezahlt oder storniert – und nur die ersten drei sind
 * Geld, mit dem sich rechnen laesst.
 */
export async function getStatusStaende(userId: string) {
  const staende = await db.commission.groupBy({
    by: ['status'],
    where: { userId },
    _sum: { amountCents: true },
    _count: true,
  })

  const je = (status: CommissionStatus) => {
    const zeile = staende.find((s) => s.status === status)
    return { summeCents: zeile?._sum.amountCents ?? 0, anzahl: zeile?._count ?? 0 }
  }

  return {
    offen: je('PENDING'),
    genehmigt: je('APPROVED'),
    ausgezahlt: je('PAID'),
    storno: je('CLAWBACK'),
  }
}

export async function getTeamProvisionen() {
  const jetzt = new Date()
  const periode = periodeVon(jetzt)

  const [proNutzer, inPeriode] = await Promise.all([
    db.commission.groupBy({
      by: ['userId'],
      where: OHNE_STORNO,
      _sum: { amountCents: true },
      _count: true,
    }),
    db.commission.groupBy({
      by: ['userId'],
      where: { ...OHNE_STORNO, periodMonth: periode },
      _sum: { amountCents: true },
      _count: true,
    }),
  ])

  const users = await db.user.findMany({
    where: { id: { in: proNutzer.map((p) => p.userId) } },
    select: { id: true, displayName: true, team: { select: { name: true } } },
  })

  return proNutzer
    .map((p) => ({
      userId: p.userId,
      anzahl: p._count,
      summeCents: p._sum.amountCents ?? 0,
      periodeCents: inPeriode.find((x) => x.userId === p.userId)?._sum.amountCents ?? 0,
      user: users.find((u) => u.id === p.userId) ?? null,
    }))
    .sort((a, b) => b.periodeCents - a.periodeCents)
}
