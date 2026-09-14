'use server'

import { revalidatePath } from 'next/cache'
import type { DuelMetric, DuelMode } from '@prisma/client'
import type { ActionErgebnis } from '@/lib/actions'
import { db } from '@/lib/db'
import { angemeldeterNutzer } from '@/lib/session'
import { METRIK_INFO, SEITEN_GROESSE, vorlagenZeitraum, type ZeitraumVorlage } from '@/lib/duels'
import { ausTeilen } from '@/lib/time'
import { eingabeAlsCents } from '@/lib/utils'

/**
 * Schreibende Vorgaenge des Duell-Moduls.
 *
 * Dieselben zwei Regeln wie im Provisionsmodul:
 * 1. Die Anmeldung wird selbst geprueft, ueber angemeldeterNutzer() und damit
 *    gegen die Datenbank – Server Actions sind ueber einen direkten POST
 *    erreichbar, nicht nur ueber die eigene Oberflaeche.
 * 2. Es wird nur an Duellen gearbeitet, an denen man selbst beteiligt ist.
 *    Jede Abfrage filtert zusaetzlich auf die eigene userId.
 */

const PFAD = '/dashboard/duels'

function aktualisiere() {
  revalidatePath(PFAD)
  revalidatePath('/dashboard')
}

/**
 * Abgelaufene Duelle nachziehen.
 *
 * Die Anzeige braucht das nicht – dort wird die Phase ohnehin aus endsAt
 * abgeleitet, ein Duell ist also in dem Moment beendet, in dem sein Fenster zu
 * ist. Die Statusspalte hinterherzuziehen haelt nur die Datenbank ehrlich und
 * die Ranglisten-Abfrage schmal. Deshalb laeuft das hier beilaeufig bei jeder
 * schreibenden Aktion mit und nicht als Hintergrundjob.
 */
async function abgelaufeneNachziehen(jetzt: Date) {
  await db.duel.updateMany({
    where: { status: 'RUNNING', endsAt: { lte: jetzt } },
    data: { status: 'FINISHED' },
  })
  // Eine Einladung, die niemand beantwortet hat, verfaellt mit dem Zeitfenster.
  await db.duel.updateMany({
    where: { status: 'OPEN', endsAt: { lte: jetzt } },
    data: { status: 'CANCELLED' },
  })
}

const METRIKEN: DuelMetric[] = [
  'COMMISSION_CENTS',
  'BOOKINGS',
  'SALES',
  'CHURN_SAVED',
  'CALLS',
  'POINTS',
]
const VORLAGEN: ZeitraumVorlage[] = ['HEUTE', 'WOCHE', 'PERIODE']

/** Mehrfachauswahl aus dem Formular, ohne Leereintraege und ohne Dubletten. */
function idsAus(formData: FormData, feld: string) {
  return [
    ...new Set(
      formData
        .getAll(feld)
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  ]
}

/**
 * Ein Duell ausrufen.
 *
 * Der Zeitraum kommt aus einer der drei Vorlagen oder als eigenes Datum. Er
 * laeuft in jedem Fall ueber time.ts – ein Tagesduell endet um Mitternacht
 * deutscher Zeit und nicht um 02:00, weil der Server in UTC laeuft.
 */
export async function duellStarten(formData: FormData): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()
  const jetzt = new Date()
  await abgelaufeneNachziehen(jetzt)

  const mode: DuelMode = formData.get('modus') === 'TWO_VS_TWO' ? 'TWO_VS_TWO' : 'ONE_VS_ONE'
  const proSeite = SEITEN_GROESSE[mode]

  const metricRoh = String(formData.get('metrik') ?? '')
  if (!METRIKEN.includes(metricRoh as DuelMetric)) {
    return { ok: false, fehler: 'Diese Disziplin gibt es nicht.' }
  }
  const metric = metricRoh as DuelMetric

  // Seite 1 bin ich, dazu bei 2 gegen 2 eine Partnerin oder ein Partner.
  const partner = idsAus(formData, 'partner').slice(0, proSeite - 1)
  const gegner = idsAus(formData, 'gegner').slice(0, proSeite)

  if (gegner.length !== proSeite) {
    return {
      ok: false,
      fehler:
        proSeite === 1
          ? 'Bitte eine Gegnerin oder einen Gegner auswählen.'
          : 'Für 2 gegen 2 braucht die andere Seite genau zwei Leute.',
    }
  }
  if (partner.length !== proSeite - 1) {
    return { ok: false, fehler: 'Für 2 gegen 2 fehlt noch die eigene Partnerin oder der Partner.' }
  }

  const alle = [user.id, ...partner, ...gegner]
  if (new Set(alle).size !== alle.length) {
    return { ok: false, fehler: 'Jede Person kann nur einmal antreten.' }
  }

  const bekannt = await db.user.count({ where: { id: { in: [...partner, ...gegner] } } })
  if (bekannt !== partner.length + gegner.length) {
    return { ok: false, fehler: 'Mindestens eine ausgewählte Person gibt es nicht (mehr).' }
  }

  const zeitraum = leseZeitraum(formData, jetzt)
  if ('fehler' in zeitraum) return { ok: false, fehler: zeitraum.fehler }

  const target = leseZiel(formData, metric)
  if (target === 'ungueltig') {
    return { ok: false, fehler: 'Der Zielwert muss eine Zahl größer als null sein.' }
  }

  await db.duel.create({
    data: {
      mode,
      metric,
      target,
      stake:
        String(formData.get('einsatz') ?? '')
          .trim()
          .slice(0, 80) || null,
      startsAt: zeitraum.von,
      endsAt: zeitraum.bis,
      status: 'OPEN',
      createdById: user.id,
      participants: {
        create: [
          // Wer herausfordert, hat damit zugesagt. Alle anderen muessen erst.
          { userId: user.id, side: 1, accepted: true },
          ...partner.map((id) => ({ userId: id, side: 1, accepted: false })),
          ...gegner.map((id) => ({ userId: id, side: 2, accepted: false })),
        ],
      },
    },
  })

  aktualisiere()
  return { ok: true, hinweis: 'Herausforderung ist raus.' }
}

type ZeitraumErgebnis = { von: Date; bis: Date } | { fehler: string }

function leseZeitraum(formData: FormData, jetzt: Date): ZeitraumErgebnis {
  const vorlage = String(formData.get('zeitraum') ?? 'HEUTE')

  if (VORLAGEN.includes(vorlage as ZeitraumVorlage)) {
    return vorlagenZeitraum(vorlage as ZeitraumVorlage, jetzt)
  }
  if (vorlage !== 'EIGEN') return { fehler: 'Unbekannter Zeitraum.' }

  const von = tagAus(String(formData.get('von') ?? ''))
  const bis = tagAus(String(formData.get('bis') ?? ''))
  if (!von || !bis) return { fehler: 'Bitte Start- und Enddatum angeben.' }
  // Das Enddatum ist einschliessend gemeint: bis Freitag heisst Freitag abend.
  const ende = new Date(bis.getTime() + 86_400_000)
  if (ende.getTime() <= von.getTime()) return { fehler: 'Das Ende liegt vor dem Start.' }
  if (ende.getTime() - von.getTime() > 190 * 86_400_000) {
    return { fehler: 'Ein Duell über mehr als ein halbes Jahr ist eine Challenge.' }
  }
  if (ende.getTime() <= jetzt.getTime()) return { fehler: 'Der Zeitraum ist schon vorbei.' }
  return { von, bis: ende }
}

/** "2026-09-10" als Tagesbeginn in deutscher Zeit. */
function tagAus(wert: string) {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert.trim())
  if (!treffer) return null
  const [, jahr, monat, tag] = treffer
  return ausTeilen(Number(jahr), Number(monat), Number(tag))
}

/**
 * Der Zielwert wird in der Einheit der Metrik getippt – bei Provision in Euro,
 * sonst als Stueckzahl. Gespeichert wird wie ueberall in Cent.
 */
function leseZiel(formData: FormData, metric: DuelMetric): number | null | 'ungueltig' {
  const roh = String(formData.get('ziel') ?? '').trim()
  if (!roh) return null

  if (METRIK_INFO[metric].einheit === 'euro') {
    const cents = eingabeAlsCents(roh)
    return cents !== null && cents > 0 ? cents : 'ungueltig'
  }
  const zahl = Number(roh.replace(',', '.'))
  return Number.isFinite(zahl) && zahl > 0 ? Math.round(zahl) : 'ungueltig'
}

/**
 * Einladung annehmen. Sobald niemand mehr fehlt, laeuft das Duell.
 *
 * Ein noch nicht angenommenes Duell zeigt seinen Stand bereits an. Das ist
 * Absicht: wer um 16 Uhr zum Tagesduell gebeten wird, soll sehen koennen,
 * was die Gegenseite bis dahin schon gebucht hat, bevor er zusagt.
 */
export async function einladungAnnehmen(duelId: string): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()
  const jetzt = new Date()

  const duell = await db.duel.findFirst({
    where: { id: duelId, participants: { some: { userId: user.id } } },
    include: { participants: true },
  })
  if (!duell) return { ok: false, fehler: 'Duell nicht gefunden.' }
  if (duell.status !== 'OPEN') return { ok: false, fehler: 'Diese Einladung ist nicht mehr offen.' }
  if (duell.endsAt.getTime() <= jetzt.getTime()) {
    await abgelaufeneNachziehen(jetzt)
    aktualisiere()
    return { ok: false, fehler: 'Der Zeitraum dieses Duells ist schon vorbei.' }
  }

  await db.duelParticipant.updateMany({
    where: { duelId, userId: user.id },
    data: { accepted: true },
  })

  const fehlen = duell.participants.filter((p) => p.userId !== user.id && !p.accepted).length
  if (fehlen === 0) await db.duel.update({ where: { id: duelId }, data: { status: 'RUNNING' } })

  aktualisiere()
  return {
    ok: true,
    hinweis:
      fehlen === 0 ? 'Angenommen – das Duell läuft.' : 'Angenommen. Es fehlt noch eine Zusage.',
  }
}

/** Absagen. Ob als eingeladene Person oder als Herausforderer – das Duell ist damit durch. */
export async function einladungAblehnen(duelId: string): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()

  const teilnahme = await db.duelParticipant.findFirst({ where: { duelId, userId: user.id } })
  if (!teilnahme) return { ok: false, fehler: 'Duell nicht gefunden.' }

  const { count } = await db.duel.updateMany({
    where: { id: duelId, status: 'OPEN' },
    data: { status: 'DECLINED' },
  })
  if (count === 0) return { ok: false, fehler: 'Diese Einladung ist nicht mehr offen.' }

  aktualisiere()
  return { ok: true, hinweis: 'Abgelehnt.' }
}

/**
 * Ein laufendes Duell abbrechen. Nur der Herausforderer darf das, und nur
 * einvernehmlich gedacht – ein Ergebnis wird nicht mehr gewertet.
 */
export async function duellAbsagen(duelId: string): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()

  const { count } = await db.duel.updateMany({
    where: { id: duelId, createdById: user.id, status: { in: ['OPEN', 'RUNNING'] } },
    data: { status: 'CANCELLED' },
  })
  if (count === 0) {
    return { ok: false, fehler: 'Absagen kann nur, wer herausgefordert hat – und nur vor Ablauf.' }
  }

  aktualisiere()
  return { ok: true, hinweis: 'Duell abgesagt.' }
}
