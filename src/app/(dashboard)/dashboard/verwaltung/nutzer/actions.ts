'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { Prisma, type Role } from '@prisma/client'
import type { ActionErgebnis } from '@/lib/actions'
import { db } from '@/lib/db'
import { angemeldeterAdmin } from '@/lib/session'
import {
  JOBTITLE_MAX,
  pruefePasswort,
  saeubereEmail,
  saeubereFreitext,
  saeubereName,
} from '@/lib/profil'

/**
 * Nutzerverwaltung. Alles hier setzt eine Adminrolle voraus, und zwar nach dem
 * Stand der Datenbank – ein Token allein reicht nicht (src/lib/session.ts).
 *
 * Zwei Dinge kann auch ein Admin nicht: sich selbst deaktivieren und sich
 * selbst die Adminrolle nehmen. Beides waere ein Weg, die Verwaltung
 * auszusperren, aus dem nur noch die Datenbank direkt herausfuehrt.
 */

const PFAD = '/dashboard/verwaltung/nutzer'

const ROLLEN: Role[] = ['REP', 'ADMIN']

/** Ein neues Konto anlegen. Das Passwort setzt der Admin und gibt es weiter. */
export async function nutzerAnlegen(formData: FormData): Promise<ActionErgebnis> {
  await angemeldeterAdmin()

  const email = saeubereEmail(String(formData.get('email') ?? ''))
  if (!email) return { ok: false, fehler: 'Bitte eine gültige E-Mail-Adresse eintragen.' }

  const displayName = saeubereName(String(formData.get('displayName') ?? ''))
  if (!displayName) return { ok: false, fehler: 'Der Anzeigename braucht mindestens zwei Zeichen.' }

  const passwort = String(formData.get('passwort') ?? '')
  const fehler = pruefePasswort(passwort, passwort)
  if (fehler) return { ok: false, fehler }

  const rolleRoh = String(formData.get('role') ?? 'REP') as Role
  const role = ROLLEN.includes(rolleRoh) ? rolleRoh : 'REP'

  const teamId = String(formData.get('teamId') ?? '') || null
  if (teamId && !(await db.team.findUnique({ where: { id: teamId } }))) {
    return { ok: false, fehler: 'Dieses Team gibt es nicht.' }
  }

  try {
    await db.user.create({
      data: {
        email,
        displayName,
        jobTitle: saeubereFreitext(String(formData.get('jobTitle') ?? ''), JOBTITLE_MAX),
        role,
        teamId,
        passwordHash: await bcrypt.hash(passwort, 10),
      },
    })
  } catch (error) {
    // P2002: die E-Mail gibt es schon. Der einzige Fehler, der hier im
    // Alltag vorkommt – und der einzige, der eine eigene Meldung verdient.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, fehler: 'Mit dieser E-Mail gibt es schon ein Konto.' }
    }
    throw error
  }

  revalidatePath(PFAD)
  return { ok: true, hinweis: `${displayName} angelegt. Passwort bitte persönlich weitergeben.` }
}

export async function rolleSetzen(userId: string, role: Role): Promise<ActionErgebnis> {
  const admin = await angemeldeterAdmin()
  if (!ROLLEN.includes(role)) return { ok: false, fehler: 'Unbekannte Rolle.' }
  if (userId === admin.id && role !== 'ADMIN') {
    return { ok: false, fehler: 'Die eigene Adminrolle lässt sich hier nicht abgeben.' }
  }

  const { count } = await db.user.updateMany({ where: { id: userId }, data: { role } })
  if (count === 0) return { ok: false, fehler: 'Konto nicht gefunden.' }

  revalidatePath(PFAD)
  return { ok: true, hinweis: 'Rolle geändert.' }
}

export async function teamSetzen(userId: string, teamId: string | null): Promise<ActionErgebnis> {
  await angemeldeterAdmin()

  if (teamId && !(await db.team.findUnique({ where: { id: teamId } }))) {
    return { ok: false, fehler: 'Dieses Team gibt es nicht.' }
  }

  const { count } = await db.user.updateMany({ where: { id: userId }, data: { teamId } })
  if (count === 0) return { ok: false, fehler: 'Konto nicht gefunden.' }

  revalidatePath(PFAD)
  return { ok: true, hinweis: 'Team geändert.' }
}

/**
 * Konto abschalten statt loeschen: an den Buchungen haengt die Abrechnung, und
 * die muss auch fuer ausgeschiedene Kolleginnen und Kollegen nachvollziehbar
 * bleiben. Wer deaktiviert ist, kommt nicht mehr herein – auch nicht mit einer
 * noch offenen Sitzung.
 */
export async function aktivSetzen(userId: string, active: boolean): Promise<ActionErgebnis> {
  const admin = await angemeldeterAdmin()
  if (userId === admin.id && !active) {
    return { ok: false, fehler: 'Das eigene Konto lässt sich hier nicht abschalten.' }
  }

  const { count } = await db.user.updateMany({ where: { id: userId }, data: { active } })
  if (count === 0) return { ok: false, fehler: 'Konto nicht gefunden.' }

  revalidatePath(PFAD)
  return { ok: true, hinweis: active ? 'Konto wieder aktiv.' : 'Konto deaktiviert.' }
}

/** Passwort vergessen – der Admin setzt ein neues und gibt es persoenlich weiter. */
export async function passwortZuruecksetzen(userId: string, neu: string): Promise<ActionErgebnis> {
  await angemeldeterAdmin()

  const fehler = pruefePasswort(neu, neu)
  if (fehler) return { ok: false, fehler }

  const { count } = await db.user.updateMany({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(neu, 10) },
  })
  if (count === 0) return { ok: false, fehler: 'Konto nicht gefunden.' }

  revalidatePath(PFAD)
  return { ok: true, hinweis: 'Passwort gesetzt. Bitte persönlich weitergeben.' }
}
