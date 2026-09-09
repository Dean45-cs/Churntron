import { db } from '@/lib/db'

export * from '@/lib/queries/commissions'
export * from '@/lib/queries/objections'

/**
 * Alle Datenabfragen der Dashboard-Seiten.
 *
 * Die Abfragen des Provisionsmoduls und der Einwand-Wiki stehen wegen des
 * Umfangs in den Nachbardateien commissions.ts und objections.ts und werden
 * hier wieder mit ausgegeben – fuer die Seiten bleibt es bei einem einzigen
 * Import aus '@/lib/queries'.
 *
 * Warum hier und nicht in den Seiten: Server-Components sollen rein bleiben –
 * Zeitbezuege wie Date.now() gehoeren nicht in den Render-Pfad. Ausserdem ist
 * das die Stelle, an der spaeter das DataSource-Interface greift, wenn die
 * Daten aus Dynamics statt aus dem Excel-Import kommen.
 */

const TAG = 86_400_000

// --- Konto -----------------------------------------------------------------

/**
 * Die Angaben zum eigenen Konto, die nicht schon in der Sitzung stecken.
 *
 * Name, Rolle, Team und Profilbild kommen aus src/lib/session.ts – hier steht
 * nur, was ausschliesslich die Kontoseite braucht.
 */
export async function getKontoDaten(userId: string) {
  const [user, buchungen] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { createdAt: true, lastLoginAt: true },
    }),
    db.commission.count({ where: { userId } }),
  ])

  return { ...user, buchungen }
}

// --- Verwaltung ------------------------------------------------------------

/**
 * Alle Konten fuer die Nutzerverwaltung. Nur fuer Admins – die Seite prueft das,
 * bevor sie hierher kommt.
 *
 * Ohne die Bild-Bytes: gebraucht wird nur die Version fuer die Bild-Adresse.
 */
export async function getNutzerListe() {
  return db.user.findMany({
    orderBy: [{ active: 'desc' }, { displayName: 'asc' }],
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      active: true,
      teamId: true,
      lastLoginAt: true,
      createdAt: true,
      avatar: { select: { version: true } },
      _count: { select: { commissions: true } },
    },
  })
}

export async function getTeams() {
  return db.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
}

// --- Übersicht -------------------------------------------------------------

export async function getUebersichtKennzahlen() {
  const seit30Tagen = new Date(Date.now() - 30 * TAG)

  const [offen, zurueck, verloren, provisionOffen, punkte] = await Promise.all([
    db.contract.count({ where: { status: { in: ['CANCELLED', 'REVOKED'] } } }),
    db.contract.count({ where: { status: 'WON_BACK' } }),
    db.contract.count({ where: { status: 'LOST' } }),
    db.commission.aggregate({
      _sum: { amountCents: true },
      where: { status: { in: ['PENDING', 'APPROVED'] } },
    }),
    db.pointsEvent.aggregate({
      _sum: { points: true },
      where: { occurredAt: { gte: seit30Tagen } },
    }),
  ])

  const bearbeitet = zurueck + verloren
  return {
    offen,
    zurueck,
    bearbeitet,
    quote: bearbeitet > 0 ? Math.round((zurueck / bearbeitet) * 100) : 0,
    provisionOffenCents: provisionOffen._sum.amountCents ?? 0,
    punkte30Tage: punkte._sum.points ?? 0,
  }
}

export async function getFaelligeWiedervorlagen(limit = 5) {
  const inZweiWochen = new Date(Date.now() + 14 * TAG)
  return db.contract.findMany({
    where: {
      status: { in: ['CANCELLED', 'REVOKED'] },
      reactivateAt: { lte: inZweiWochen },
    },
    orderBy: { reactivateAt: 'asc' },
    take: limit,
    select: { id: true, externalRef: true, reactivateAt: true, cancelReason: true, product: true },
  })
}

export async function getLetzteAktivitaeten(limit = 5) {
  return db.churnActivity.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      outcome: true,
      createdAt: true,
      contract: { select: { externalRef: true } },
      user: { select: { displayName: true } },
    },
  })
}

// --- Churn -----------------------------------------------------------------

export async function getChurnKennzahlen() {
  const jetzt = new Date()

  const [gekuendigt, widerrufen, faellig, gruende] = await Promise.all([
    db.contract.count({ where: { status: 'CANCELLED' } }),
    db.contract.count({ where: { status: 'REVOKED' } }),
    db.contract.count({
      where: { status: { in: ['CANCELLED', 'REVOKED'] }, reactivateAt: { lte: jetzt } },
    }),
    db.contract.groupBy({
      by: ['cancelReason'],
      where: { status: { in: ['CANCELLED', 'REVOKED'] } },
      _count: true,
      orderBy: { _count: { cancelReason: 'desc' } },
      take: 1,
    }),
  ])

  return { gekuendigt, widerrufen, faellig, topGrund: gruende[0] ?? null }
}

export async function getOffeneChurnFaelle(limit = 12) {
  const jetzt = Date.now()

  const [contracts, gesamt] = await Promise.all([
    db.contract.findMany({
      where: { status: { in: ['CANCELLED', 'REVOKED'] } },
      orderBy: [{ reactivateAt: 'asc' }],
      take: limit,
      select: {
        id: true,
        externalRef: true,
        product: true,
        status: true,
        cancelReason: true,
        reasonRaw: true,
        cancelledAt: true,
        reactivateAt: true,
        owner: { select: { displayName: true } },
      },
    }),
    db.contract.count({ where: { status: { in: ['CANCELLED', 'REVOKED'] } } }),
  ])

  // Die Faelligkeit wird hier entschieden, damit die Seite keine Zeit kennt.
  return {
    gesamt,
    contracts: contracts.map((c) => ({
      ...c,
      ueberfaellig: c.reactivateAt ? c.reactivateAt.getTime() <= jetzt : false,
    })),
  }
}

// --- Challenges ------------------------------------------------------------

export async function getChallengesMitFortschritt() {
  const jetzt = Date.now()
  const challenges = await db.challenge.findMany({
    orderBy: { endsAt: 'asc' },
    include: { _count: { select: { pointsEvents: true } } },
  })

  return challenges.map((c) => ({
    ...c,
    // Platzhalter-Fortschritt: zaehlt Ereignisse. Die echte Metrik-Logik haengt
    // an der noch offenen Punkteregel (siehe PLAN.md, offene Punkte).
    fortschritt: Math.min(100, (c._count.pointsEvents / c.target) * 100),
    restTage: Math.max(0, Math.ceil((c.endsAt.getTime() - jetzt) / TAG)),
    laeuft: c.startsAt.getTime() <= jetzt && c.endsAt.getTime() >= jetzt,
  }))
}

export async function getLeaderboard(tage = 30) {
  const seit = new Date(Date.now() - tage * TAG)

  const punkte = await db.pointsEvent.groupBy({
    by: ['userId'],
    _sum: { points: true },
    where: { occurredAt: { gte: seit } },
  })
  const users = await db.user.findMany({
    where: { id: { in: punkte.map((p) => p.userId) } },
    select: { id: true, displayName: true, team: { select: { name: true } } },
  })

  return punkte
    .map((p) => ({
      userId: p.userId,
      punkte: p._sum.points ?? 0,
      user: users.find((u) => u.id === p.userId) ?? null,
    }))
    .sort((a, b) => b.punkte - a.punkte)
}
