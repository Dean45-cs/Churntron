import type { DuelMetric, DuelMode, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import {
  bilanzAus,
  formatMetrik,
  phaseLebt,
  phaseVon,
  punkteJeTeilnehmer,
  werteDuellAus,
  type Bilanz,
  type DuellPhase,
  type DuellStand,
  type Rohdaten,
} from '@/lib/duels'
import { tagesBeginn, tagesEnde, tagesSchluessel } from '@/lib/time'

/**
 * Abfragen des Duell-Moduls.
 *
 * Dieselbe Regel wie in den Nachbardateien: hier stehen die Zeitbezuege, die
 * Seiten bekommen fertige Werte. Eine Duell-Karte soll keinen Zeitstempel mehr
 * vergleichen muessen – sie bekommt "noch 3 Stunden" als Text.
 *
 * Der Punktestand wird nirgends gespeichert. Diese Datei laedt einmal die
 * Rohzeilen, die alle geladenen Duelle zusammen brauchen, und src/lib/duels.ts
 * rechnet daraus jeden einzelnen Stand.
 */

const MINUTE = 60_000
const STUNDE = 3_600_000
const TAG = 86_400_000

const DATUM_KURZ = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Berlin',
})

const DATUM_LANG = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Berlin',
})

const UHRZEIT = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
})

export type DuellMitspieler = {
  userId: string
  name: string
  team: string | null
  /** Kennung des Profilbildes, oder null. Traegt die Bild-URL in <Avatar/>. */
  avatarVersion: string | null
  wert: number
  /** Der Wert als Text in der Einheit der Metrik – fertig fuer die Anzeige. */
  wertText: string
  angenommen: boolean
  binIch: boolean
}

export type DuellSeiteAnsicht = {
  seite: number
  wert: number
  wertText: string
  anteil: number
  fuehrt: boolean
  gewinnt: boolean
  /** Steht die eigene Person auf dieser Seite? */
  meine: boolean
  mitspieler: DuellMitspieler[]
}

export type DuellAnsicht = {
  id: string
  mode: DuelMode
  metric: DuelMetric
  phase: DuellPhase
  stake: string | null
  target: number | null
  zielText: string | null
  /** "Heute, 10.09.2026" oder "10.09. – 16.09.2026" */
  zeitraumText: string
  /** "noch 3 Std." bzw. "startet in 2 Tagen" – null, sobald das Duell durch ist. */
  restText: string | null
  seiten: DuellSeiteAnsicht[]
  unentschieden: boolean
  /** Erst nach Schluss gesetzt – vorher fuehrt jemand, gewonnen hat niemand. */
  gewinnerSeite: number | null
  vorsprungText: string
  zielProzent: number | null
  zielErreicht: boolean
  /** 1, 2 oder null, wenn man nur zuschaut. */
  meineSeite: number | null
  /** Ein Satz, der das Ergebnis benennt – die Karte muss nichts mehr ableiten. */
  ergebnisText: string
  herausforderer: string
  binHerausforderer: boolean
  /** Liegt eine Einladung vor, die ich noch beantworten muss? */
  mussIchAntworten: boolean
  /** Wer noch nicht zugesagt hat – als fertiger Text. */
  wartetAufText: string | null
}

export type DuellUebersicht = {
  einladungen: DuellAnsicht[]
  laufend: DuellAnsicht[]
  beendet: DuellAnsicht[]
  bilanz: Bilanz
}

const MIT_TEILNEHMERN = {
  participants: {
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          team: { select: { name: true } },
          // Nur die Version, nie die Bytes – die holt allein die Bild-Route.
          avatar: { select: { version: true } },
        },
      },
    },
  },
  createdBy: { select: { displayName: true } },
} satisfies Prisma.DuelInclude

type DuellZeile = Prisma.DuelGetPayload<{ include: typeof MIT_TEILNEHMERN }>

/**
 * Die Rohzeilen fuer alle uebergebenen Duelle auf einen Schlag.
 *
 * Geladen wird nur, was auch gebraucht wird: laufen ausschliesslich Duelle um
 * Provision, faellt die Abfrage auf Churn-Aktivitaeten ganz weg. Das Fenster
 * spannt vom fruehesten Start bis zum spaetesten Ende aller Duelle.
 */
async function ladeRohdaten(duelle: DuellZeile[]): Promise<Rohdaten> {
  const userIds = [...new Set(duelle.flatMap((d) => d.participants.map((p) => p.userId)))]
  if (userIds.length === 0) return { provisionen: [], aktivitaeten: [], punkte: [] }

  const metriken = new Set(duelle.map((d) => d.metric))
  const von = new Date(Math.min(...duelle.map((d) => d.startsAt.getTime())))
  const bis = new Date(Math.max(...duelle.map((d) => d.endsAt.getTime())))
  const fenster = { gte: von, lt: bis }

  const brauchtProvision =
    metriken.has('COMMISSION_CENTS') || metriken.has('BOOKINGS') || metriken.has('SALES')
  const brauchtAktivitaet = metriken.has('CHURN_SAVED') || metriken.has('CALLS')

  const [provisionen, aktivitaeten, punkte] = await Promise.all([
    brauchtProvision
      ? db.commission.findMany({
          where: { userId: { in: userIds }, occurredAt: fenster },
          select: {
            userId: true,
            occurredAt: true,
            amountCents: true,
            status: true,
            rule: { select: { category: true } },
          },
        })
      : [],
    brauchtAktivitaet
      ? db.churnActivity.findMany({
          where: { userId: { in: userIds }, createdAt: fenster },
          select: { userId: true, createdAt: true, type: true, outcome: true },
        })
      : [],
    metriken.has('POINTS')
      ? db.pointsEvent.findMany({
          where: { userId: { in: userIds }, occurredAt: fenster },
          select: { userId: true, occurredAt: true, points: true },
        })
      : [],
  ])

  return {
    provisionen: provisionen.map((z) => ({
      userId: z.userId,
      occurredAt: z.occurredAt,
      amountCents: z.amountCents,
      status: z.status,
      kategorie: z.rule?.category ?? null,
    })),
    aktivitaeten: aktivitaeten.map((z) => ({
      userId: z.userId,
      occurredAt: z.createdAt,
      typ: z.type,
      ergebnis: z.outcome,
    })),
    punkte: punkte.map((z) => ({ userId: z.userId, occurredAt: z.occurredAt, punkte: z.points })),
  }
}

/**
 * "Heute", "09.09.2026" oder "07.09. – 13.09.2026".
 *
 * Uhrzeiten stehen nur da, wo sie etwas beitragen: ein Duell ueber einen ganzen
 * Tag laeuft von Mitternacht bis Mitternacht, und "00:00 – 00:00 Uhr" ist keine
 * Auskunft, sondern eine Zumutung.
 */
function zeitraumText(von: Date, bis: Date, jetzt: Date) {
  const tagName = tagesSchluessel(von) === tagesSchluessel(jetzt) ? 'Heute' : DATUM_LANG.format(von)
  const ganzerTag =
    von.getTime() === tagesBeginn(von).getTime() && bis.getTime() === tagesEnde(von).getTime()
  if (ganzerTag) return tagName

  // bis ist ausschliessend: der letzte Tag ist die Sekunde davor.
  const letzterTag = new Date(bis.getTime() - 1000)
  if (tagesSchluessel(von) === tagesSchluessel(letzterTag)) {
    return `${tagName}, ${UHRZEIT.format(von)} – ${UHRZEIT.format(bis)} Uhr`
  }
  return `${DATUM_KURZ.format(von)} – ${DATUM_LANG.format(letzterTag)}`
}

/** "noch 3 Std." – der Countdown, der auf der Karte steht. */
function restText(von: Date, bis: Date, jetzt: Date) {
  if (bis.getTime() <= jetzt.getTime()) return null
  if (von.getTime() > jetzt.getTime()) {
    const tage = Math.ceil((von.getTime() - jetzt.getTime()) / TAG)
    return tage <= 1 ? 'startet gleich' : `startet in ${tage} Tagen`
  }
  const rest = bis.getTime() - jetzt.getTime()
  if (rest >= 2 * TAG) return `noch ${Math.floor(rest / TAG)} Tage`
  if (rest >= TAG) return 'noch 1 Tag'
  if (rest >= STUNDE) return `noch ${Math.floor(rest / STUNDE)} Std.`
  return `noch ${Math.max(1, Math.floor(rest / MINUTE))} Min.`
}

function ergebnisText(
  phase: DuellPhase,
  stand: DuellStand,
  seiten: DuellSeiteAnsicht[],
  metric: DuelMetric,
  meineSeite: number | null,
) {
  const namen = (seite: number) =>
    seiten
      .find((s) => s.seite === seite)
      ?.mitspieler.map((m) => m.name)
      .join(' & ') ?? '—'

  if (phase === 'ABGELEHNT') return 'Die Einladung wurde abgelehnt.'
  if (phase === 'ABGESAGT') return 'Das Duell wurde abgesagt.'
  if (phase === 'VERFALLEN') return 'Niemand hat die Einladung rechtzeitig angenommen.'

  if (phase === 'BEENDET') {
    if (stand.unentschieden) return 'Unentschieden – keiner hat gewonnen.'
    const sieger = stand.gewinnerSeite
    if (sieger === null) return 'Kein Ergebnis.'
    const vorsprung = formatMetrik(metric, stand.vorsprung)
    if (meineSeite !== null) {
      return sieger === meineSeite
        ? `Gewonnen, mit ${vorsprung} Vorsprung.`
        : `Verloren, ${vorsprung} gefehlt.`
    }
    return `${namen(sieger)} gewinnt mit ${vorsprung} Vorsprung.`
  }

  if (stand.unentschieden) return 'Gleichstand – noch ist alles offen.'
  const fuehrt = stand.seiten.find((s) => s.fuehrt)?.seite ?? null
  if (fuehrt === null) return 'Noch kein Punkt gefallen.'
  const vorsprung = formatMetrik(metric, stand.vorsprung)
  if (meineSeite !== null) {
    return fuehrt === meineSeite ? `Du führst mit ${vorsprung}.` : `Du liegst ${vorsprung} zurück.`
  }
  return `${namen(fuehrt)} führt mit ${vorsprung}.`
}

/** Eine Duell-Zeile in die fertige Ansicht uebersetzen. */
function baueAnsicht(d: DuellZeile, userId: string, roh: Rohdaten, jetzt: Date): DuellAnsicht {
  const phase = phaseVon(d.status, d.endsAt, jetzt)
  const teilnehmer = d.participants.map((p) => ({
    userId: p.userId,
    name: p.user.displayName,
    seite: p.side,
    angenommen: p.accepted,
  }))

  // Fuer abgelehnte und abgesagte Duelle wird nichts gerechnet – da gab es
  // kein Spiel, also gibt es auch keinen Stand.
  const werte = phaseLebt(phase)
    ? punkteJeTeilnehmer(
        d.metric,
        teilnehmer.map((t) => t.userId),
        d.startsAt,
        d.endsAt,
        roh,
      )
    : {}

  const stand = werteDuellAus({
    teilnehmer,
    werte,
    target: d.target,
    beendet: phase === 'BEENDET',
  })

  const meinePartizipation = d.participants.find((p) => p.userId === userId) ?? null
  const meineSeite = meinePartizipation?.side ?? null

  const seiten: DuellSeiteAnsicht[] = stand.seiten.map((s) => ({
    seite: s.seite,
    wert: s.wert,
    wertText: formatMetrik(d.metric, s.wert),
    anteil: s.anteil,
    fuehrt: s.fuehrt,
    gewinnt: stand.gewinnerSeite === s.seite,
    meine: meineSeite === s.seite,
    mitspieler: s.mitglieder.map((m) => {
      const zeile = d.participants.find((p) => p.userId === m.userId)
      return {
        userId: m.userId,
        name: m.name,
        team: zeile?.user.team?.name ?? null,
        avatarVersion: zeile?.user.avatar?.version ?? null,
        wert: m.wert,
        wertText: formatMetrik(d.metric, m.wert),
        angenommen: m.angenommen,
        binIch: m.userId === userId,
      }
    }),
  }))

  // Die eigene ausstehende Zusage steht schon an den Tasten – im Wartetext
  // waere "wartet auf Kevin" fuer Kevin selbst nur komisch.
  const offeneZusagen = d.participants.filter((p) => !p.accepted && p.userId !== userId)

  return {
    id: d.id,
    mode: d.mode,
    metric: d.metric,
    phase,
    stake: d.stake,
    target: d.target,
    zielText: d.target ? formatMetrik(d.metric, d.target) : null,
    zeitraumText: zeitraumText(d.startsAt, d.endsAt, jetzt),
    restText: restText(d.startsAt, d.endsAt, jetzt),
    seiten,
    unentschieden: stand.unentschieden,
    gewinnerSeite: stand.gewinnerSeite,
    vorsprungText: formatMetrik(d.metric, stand.vorsprung),
    zielProzent: stand.zielProzent,
    zielErreicht: stand.zielErreicht,
    meineSeite,
    ergebnisText: ergebnisText(phase, stand, seiten, d.metric, meineSeite),
    herausforderer: d.createdBy.displayName,
    binHerausforderer: d.createdById === userId,
    mussIchAntworten: phase === 'EINLADUNG' && meinePartizipation?.accepted === false,
    wartetAufText:
      phase === 'EINLADUNG' && offeneZusagen.length > 0
        ? offeneZusagen.map((p) => p.user.displayName).join(', ')
        : null,
  }
}

/**
 * Alle Duelle, an denen ich beteiligt bin, in drei Faechern: was ich
 * beantworten muss, was gerade laeuft, was durch ist.
 *
 * Beendete Duelle werden begrenzt – die Liste soll die letzten Wochen zeigen
 * und nicht die Vereinsgeschichte.
 */
export async function getMeineDuelle(userId: string, beendeteTage = 30): Promise<DuellUebersicht> {
  const jetzt = new Date()
  const grenze = new Date(tagesBeginn(jetzt).getTime() - beendeteTage * TAG)

  const duelle = await db.duel.findMany({
    where: { participants: { some: { userId } }, endsAt: { gte: grenze } },
    include: MIT_TEILNEHMERN,
    orderBy: [{ endsAt: 'asc' }, { createdAt: 'desc' }],
  })

  const roh = await ladeRohdaten(duelle)
  const ansichten = duelle.map((d) => baueAnsicht(d, userId, roh, jetzt))

  return {
    einladungen: ansichten.filter((a) => a.phase === 'EINLADUNG'),
    laufend: ansichten.filter((a) => a.phase === 'LAEUFT'),
    // Beendete zuletzt zuerst – das jüngste Ergebnis interessiert am meisten.
    beendet: ansichten
      .filter((a) => a.phase !== 'EINLADUNG' && a.phase !== 'LAEUFT')
      .reverse()
      .slice(0, 12),
    bilanz: bilanzAus(ansichten),
  }
}

/** Ein einzelnes Duell – fuer die Detailansicht. Null, wenn es nicht meins ist. */
export async function getDuell(userId: string, duelId: string): Promise<DuellAnsicht | null> {
  const jetzt = new Date()
  const duell = await db.duel.findFirst({
    where: { id: duelId, participants: { some: { userId } } },
    include: MIT_TEILNEHMERN,
  })
  if (!duell) return null

  const roh = await ladeRohdaten([duell])
  return baueAnsicht(duell, userId, roh, jetzt)
}

export type Kollege = { id: string; displayName: string; team: string | null }

/** Gegen wen man antreten kann: alle ausser man selbst. */
export async function getKollegen(userId: string): Promise<Kollege[]> {
  const users = await db.user.findMany({
    where: { id: { not: userId } },
    orderBy: { displayName: 'asc' },
    select: { id: true, displayName: true, team: { select: { name: true } } },
  })
  return users.map((u) => ({ id: u.id, displayName: u.displayName, team: u.team?.name ?? null }))
}

/**
 * Die Duell-Rangliste des Teams: wer hat wie oft gewonnen.
 *
 * Bewusst ueber alle beendeten Duelle des Zeitraums gerechnet und nicht ueber
 * einen Zaehler je Nutzer – dieselbe Ueberlegung wie bei den PointsEvents.
 */
export async function getDuellRangliste(tage = 30) {
  const jetzt = new Date()
  const grenze = new Date(tagesBeginn(jetzt).getTime() - tage * TAG)

  const duelle = await db.duel.findMany({
    where: { status: { in: ['RUNNING', 'FINISHED'] }, endsAt: { gte: grenze, lte: jetzt } },
    include: MIT_TEILNEHMERN,
  })

  const roh = await ladeRohdaten(duelle)
  const tabelle = new Map<
    string,
    { name: string; team: string | null; avatarVersion: string | null } & Bilanz
  >()

  for (const d of duelle) {
    const ansicht = baueAnsicht(d, '', roh, jetzt)
    if (ansicht.phase !== 'BEENDET') continue

    for (const seite of ansicht.seiten) {
      for (const m of seite.mitspieler) {
        const eintrag = tabelle.get(m.userId) ?? {
          name: m.name,
          team: m.team,
          avatarVersion: m.avatarVersion,
          siege: 0,
          niederlagen: 0,
          unentschieden: 0,
        }
        if (ansicht.unentschieden) eintrag.unentschieden++
        else if (seite.gewinnt) eintrag.siege++
        else eintrag.niederlagen++
        tabelle.set(m.userId, eintrag)
      }
    }
  }

  return [...tabelle.entries()]
    .map(([userId, e]) => ({
      userId,
      ...e,
      duelle: e.siege + e.niederlagen + e.unentschieden,
      quote:
        e.siege + e.niederlagen + e.unentschieden > 0
          ? Math.round((e.siege / (e.siege + e.niederlagen + e.unentschieden)) * 100)
          : 0,
    }))
    .sort((a, b) => b.siege - a.siege || b.quote - a.quote || a.name.localeCompare(b.name))
}
