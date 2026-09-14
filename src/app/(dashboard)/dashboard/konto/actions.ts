'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import type { ActionErgebnis } from '@/lib/actions'
import { db } from '@/lib/db'
import { angemeldeterNutzer } from '@/lib/session'
import { liesAvatarDataUrl, neueAvatarVersion } from '@/lib/avatar'
import {
  ABOUT_MAX,
  JOBTITLE_MAX,
  gueltigesIntervall,
  pruefePasswort,
  saeubereFreitext,
  saeubereName,
} from '@/lib/profil'

/**
 * Das eigene Konto. Es gelten dieselben zwei Regeln wie im Provisionsmodul:
 * jede Funktion prueft die Anmeldung selbst, und jede arbeitet ausschliesslich
 * an der eigenen Zeile. Eine Nutzer-ID aus dem Formular gibt es hier nirgends –
 * sie kommt immer aus der Sitzung.
 */

/**
 * Name, Bild und Rolle stehen in der Topbar, also im gemeinsamen Layout ueber
 * allen Seiten. Deshalb der grosse Besen: nach einer Profilaenderung soll
 * ueberall der neue Stand stehen, nicht nur auf der Konto-Seite.
 */
function aktualisiereUeberall() {
  revalidatePath('/', 'layout')
}

/** Anzeigename, Funktion und der kurze Text darunter. */
export async function profilSpeichern(formData: FormData): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()

  const displayName = saeubereName(String(formData.get('displayName') ?? ''))
  if (!displayName) {
    return { ok: false, fehler: 'Der Anzeigename braucht mindestens zwei Zeichen.' }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      displayName,
      jobTitle: saeubereFreitext(String(formData.get('jobTitle') ?? ''), JOBTITLE_MAX),
      about: saeubereFreitext(String(formData.get('about') ?? ''), ABOUT_MAX),
    },
  })

  aktualisiereUeberall()
  return { ok: true, hinweis: 'Profil gespeichert.' }
}

/**
 * Profilbild setzen.
 *
 * Das Bild kommt als Data-URL an, im Browser bereits auf ein Quadrat
 * zugeschnitten. Geprueft wird trotzdem alles: Groesse und Format kommen aus
 * den Bytes selbst und nicht aus dem, was der Browser behauptet.
 */
export async function avatarSpeichern(dataUrl: string): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()

  const geprueft = liesAvatarDataUrl(dataUrl)
  if (!geprueft.ok) return { ok: false, fehler: geprueft.fehler }

  const { bytes, mimeType } = geprueft.bild
  const daten = { data: bytes, mimeType, version: neueAvatarVersion() }

  await db.userAvatar.upsert({
    where: { userId: user.id },
    update: daten,
    create: { userId: user.id, ...daten },
  })

  aktualisiereUeberall()
  return { ok: true, hinweis: 'Profilbild gespeichert.' }
}

/** Bild wieder weg – danach stehen wie zuvor die Initialen im Kreis. */
export async function avatarEntfernen(): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()
  await db.userAvatar.deleteMany({ where: { userId: user.id } })
  aktualisiereUeberall()
  return { ok: true, hinweis: 'Profilbild entfernt.' }
}

/** Anzeige-Einstellungen. Bislang genau eine: die stille Aktualisierung. */
export async function anzeigeSpeichern(formData: FormData): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()

  const autoRefreshSeconds = gueltigesIntervall(Number(formData.get('aktualisierung') ?? NaN))

  await db.userSettings.upsert({
    where: { userId: user.id },
    update: { autoRefreshSeconds },
    create: { userId: user.id, autoRefreshSeconds },
  })

  aktualisiereUeberall()
  return { ok: true, hinweis: 'Gespeichert.' }
}

/**
 * Passwort aendern.
 *
 * Das alte wird mitgeprueft, auch wenn die Sitzung schon steht: sonst genuegt
 * ein unbeaufsichtigter Rechner, um jemandem den Zugang wegzunehmen.
 */
export async function passwortAendern(formData: FormData): Promise<ActionErgebnis> {
  const user = await angemeldeterNutzer()

  const alt = String(formData.get('alt') ?? '')
  const neu = String(formData.get('neu') ?? '')
  const wiederholung = String(formData.get('wiederholung') ?? '')

  const fehler = pruefePasswort(neu, wiederholung)
  if (fehler) return { ok: false, fehler }

  const gespeichert = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  })
  if (!gespeichert) return { ok: false, fehler: 'Konto nicht gefunden.' }

  const passt = await bcrypt.compare(alt, gespeichert.passwordHash)
  if (!passt) return { ok: false, fehler: 'Das bisherige Passwort stimmt nicht.' }

  if (alt === neu) return { ok: false, fehler: 'Das neue Passwort ist das alte.' }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(neu, 10) },
  })

  return {
    ok: true,
    hinweis: 'Passwort geändert. Beim nächsten Anmelden gilt das neue.',
  }
}
