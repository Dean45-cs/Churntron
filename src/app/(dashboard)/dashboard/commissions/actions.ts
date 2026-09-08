'use server'

import { revalidatePath } from 'next/cache'
import type { CommissionStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { periodeVon } from '@/lib/period'
import { eingabeAlsCents } from '@/lib/utils'

/**
 * Schreibende Vorgaenge des Provisionsmoduls.
 *
 * Zwei Regeln gelten in jeder Funktion hier:
 * 1. Die Anmeldung wird selbst geprueft. Server Actions sind ueber einen
 *    direkten POST erreichbar, nicht nur ueber die eigene Oberflaeche.
 * 2. Es wird ausschliesslich an eigenen Zeilen gearbeitet – jede Abfrage
 *    filtert zusaetzlich auf userId, auch wenn die ID aus der eigenen Seite kommt.
 */

export type ActionErgebnis = { ok: true; hinweis?: string } | { ok: false; fehler: string }

const PFAD = '/dashboard/commissions'

async function angemeldet() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Nicht angemeldet')
  return session.user
}

function aktualisiere() {
  revalidatePath(PFAD)
  revalidatePath(`${PFAD}/verdienst`)
  revalidatePath(`${PFAD}/abgleich`)
  revalidatePath('/dashboard')
}

/**
 * Eine Buchung anlegen – der Tastendruck im Tracker.
 * Der Betrag kommt aus dem Katalog und nicht aus dem Formular: was eine
 * Leistung wert ist, entscheidet die Preisliste, nicht der Browser.
 */
export async function buchen(input: {
  key: string
  externalRef?: string | null
  note?: string | null
}): Promise<ActionErgebnis> {
  const user = await angemeldet()

  const regel = await db.commissionRule.findUnique({ where: { key: input.key } })
  if (!regel || !regel.active) return { ok: false, fehler: 'Diesen Satz gibt es im Katalog nicht.' }
  if (!regel.amountCents) {
    return { ok: false, fehler: `${regel.name}: laut Katalog ohne Provisionsanspruch.` }
  }

  const jetzt = new Date()
  const ref = input.externalRef?.trim().slice(0, 64) || null

  await db.commission.create({
    data: {
      userId: user.id,
      ruleId: regel.id,
      amountCents: regel.amountCents,
      externalRef: ref,
      note: input.note?.trim().slice(0, 280) || null,
      occurredAt: jetzt,
      periodMonth: periodeVon(jetzt),
      status: 'PENDING',
    },
  })

  aktualisiere()
  return { ok: true }
}

/** Vertippt – die Buchung wieder wegnehmen. Nur die eigene, nur eine offene. */
export async function buchungZuruecknehmen(id: string): Promise<ActionErgebnis> {
  const user = await angemeldet()

  const buchung = await db.commission.findFirst({ where: { id, userId: user.id } })
  if (!buchung) return { ok: false, fehler: 'Buchung nicht gefunden.' }
  if (buchung.status === 'PAID') {
    return {
      ok: false,
      fehler:
        'Bereits ausgezahlte Positionen bleiben stehen – sonst stimmt der Abgleich nicht mehr.',
    }
  }

  await db.commission.delete({ where: { id: buchung.id } })
  aktualisiere()
  return { ok: true }
}

const ERLAUBTE_STATUS: CommissionStatus[] = ['PENDING', 'APPROVED', 'PAID', 'CLAWBACK']

/** Statuswechsel einer einzelnen Position, z. B. beim Durchgehen der Abrechnung. */
export async function statusSetzen(id: string, status: CommissionStatus): Promise<ActionErgebnis> {
  const user = await angemeldet()
  if (!ERLAUBTE_STATUS.includes(status)) return { ok: false, fehler: 'Unbekannter Status.' }

  const { count } = await db.commission.updateMany({
    where: { id, userId: user.id },
    data: { status },
  })
  if (count === 0) return { ok: false, fehler: 'Buchung nicht gefunden.' }

  aktualisiere()
  return { ok: true }
}

/** Die Vertragsnummer nachtragen, wenn sie beim Buchen noch nicht zur Hand war. */
export async function referenzSetzen(id: string, externalRef: string): Promise<ActionErgebnis> {
  const user = await angemeldet()
  const { count } = await db.commission.updateMany({
    where: { id, userId: user.id },
    data: { externalRef: externalRef.trim().slice(0, 64) || null },
  })
  if (count === 0) return { ok: false, fehler: 'Buchung nicht gefunden.' }

  aktualisiere()
  return { ok: true }
}

/**
 * Auszahlung eintragen und gegen die gebuchten Positionen halten.
 *
 * Stimmt der Betrag auf den Cent, werden alle offenen Positionen der Periode
 * auf "ausgezahlt" gesetzt – das ist der Normalfall und soll ein Klick sein.
 * Stimmt er nicht, bleibt alles offen: dann ist Nachsehen angesagt, und dabei
 * hilft eine Liste, in der noch steht, was noch nicht bezahlt wurde.
 */
export async function auszahlungPruefen(formData: FormData): Promise<ActionErgebnis> {
  const user = await angemeldet()

  const periode = String(formData.get('periode') ?? '')
  if (!/^\d{4}-\d{2}$/.test(periode)) return { ok: false, fehler: 'Periode fehlt.' }

  const betragCents = eingabeAlsCents(String(formData.get('betrag') ?? ''))
  if (betragCents === null || betragCents < 0) {
    return { ok: false, fehler: 'Bitte einen Betrag wie 137,50 eintragen.' }
  }

  const datumRoh = String(formData.get('datum') ?? '').trim()
  const paidOn = datumRoh ? new Date(`${datumRoh}T12:00:00`) : null
  const notiz = String(formData.get('notiz') ?? '')
    .trim()
    .slice(0, 280)

  const erwartet = await db.commission.aggregate({
    _sum: { amountCents: true },
    where: { userId: user.id, periodMonth: periode, status: { not: 'CLAWBACK' } },
  })
  const erwartetCents = erwartet._sum.amountCents ?? 0
  const differenz = betragCents - erwartetCents

  await db.commissionPayout.upsert({
    where: { userId_periodKey: { userId: user.id, periodKey: periode } },
    update: { paidCents: betragCents, paidOn, note: notiz || null },
    create: {
      userId: user.id,
      periodKey: periode,
      paidCents: betragCents,
      paidOn,
      note: notiz || null,
    },
  })

  if (differenz === 0) {
    const { count } = await db.commission.updateMany({
      where: { userId: user.id, periodMonth: periode, status: { in: ['PENDING', 'APPROVED'] } },
      data: { status: 'PAID' },
    })
    aktualisiere()
    return {
      ok: true,
      hinweis:
        count > 0
          ? `Stimmt. ${count} Positionen stehen jetzt auf ausgezahlt.`
          : 'Stimmt. Alle Positionen waren bereits als ausgezahlt vermerkt.',
    }
  }

  aktualisiere()
  const vorzeichen = differenz > 0 ? 'mehr' : 'weniger'
  return {
    ok: true,
    hinweis: `${(Math.abs(differenz) / 100).toFixed(2).replace('.', ',')} € ${vorzeichen} als gebucht. Die Positionen bleiben offen, bis geklärt ist, welche fehlt.`,
  }
}

/** Alle offenen Positionen einer Periode abhaken – nach geklaerter Rückfrage. */
export async function periodeAbhaken(periode: string): Promise<ActionErgebnis> {
  const user = await angemeldet()
  if (!/^\d{4}-\d{2}$/.test(periode)) return { ok: false, fehler: 'Periode fehlt.' }

  const { count } = await db.commission.updateMany({
    where: { userId: user.id, periodMonth: periode, status: { in: ['PENDING', 'APPROVED'] } },
    data: { status: 'PAID' },
  })

  aktualisiere()
  return { ok: true, hinweis: `${count} Positionen als ausgezahlt vermerkt.` }
}

const ZAHL = (formData: FormData, feld: string, standard: number) => {
  const roh = String(formData.get(feld) ?? '').replace(',', '.')
  const wert = Number(roh)
  return Number.isFinite(wert) ? wert : standard
}

/** Wochenstunden und Steuermerkmale – Grundlage von Stundenschnitt und Rechner. */
export async function einstellungenSpeichern(formData: FormData): Promise<ActionErgebnis> {
  const user = await angemeldet()

  const weeklyHours = Math.min(80, Math.max(1, ZAHL(formData, 'wochenstunden', 40)))
  const workDaysPerWeek = Math.min(7, Math.max(1, Math.round(ZAHL(formData, 'arbeitstage', 5))))
  const baseSalaryCents = Math.max(
    0,
    eingabeAlsCents(String(formData.get('grundgehalt') ?? '0')) ?? 0,
  )
  const taxClass = Math.min(6, Math.max(1, Math.round(ZAHL(formData, 'steuerklasse', 1))))
  const churchTaxPercent = [0, 8, 9].includes(Math.round(ZAHL(formData, 'kirchensteuer', 0)))
    ? Math.round(ZAHL(formData, 'kirchensteuer', 0))
    : 0
  const childAllowances = Math.min(10, Math.max(0, ZAHL(formData, 'kinderfreibetraege', 0)))
  const children = Math.min(10, Math.max(0, Math.round(ZAHL(formData, 'kinder', 0))))
  const healthExtraRateBp = Math.min(
    500,
    Math.max(0, Math.round(ZAHL(formData, 'kvzusatz', 2.9) * 100)),
  )
  const taxYear = ZAHL(formData, 'steuerjahr', 2026) === 2025 ? 2025 : 2026

  const daten = {
    weeklyHours,
    workDaysPerWeek,
    baseSalaryCents,
    taxClass,
    churchTaxPercent,
    childAllowances,
    children,
    healthExtraRateBp,
    taxYear,
  }

  await db.userSettings.upsert({
    where: { userId: user.id },
    update: daten,
    create: { userId: user.id, ...daten },
  })

  revalidatePath(`${PFAD}/rechner`)
  revalidatePath(`${PFAD}/verdienst`)
  return { ok: true, hinweis: 'Gespeichert.' }
}
