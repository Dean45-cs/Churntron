import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AKTUALISIERUNG_STANDARD } from '@/lib/profil'

/**
 * Wer ist gerade angemeldet – und zwar nach dem Stand der Datenbank.
 *
 * Warum nicht einfach aus der Sitzung: die laeuft ueber ein JWT, und ein JWT
 * wird beim Anmelden geschrieben und danach nicht mehr angefasst. Wer seinen
 * Namen aendert oder ein Bild hochlaedt, saehe bis zur naechsten Anmeldung den
 * alten Stand; ein deaktiviertes Konto koennte weiterarbeiten, bis das Token
 * ablaeuft. Deshalb traegt das Token nur noch die ID, und alles Veraenderliche
 * kommt von hier.
 *
 * Das kostet eine Abfrage pro Aufruf. `cache` aus React fasst die Aufrufe
 * innerhalb einer Anfrage zusammen, also bleibt es bei einer – auch wenn
 * Layout, Seite und Server Action alle danach fragen.
 */

export type AngemeldeterNutzer = {
  id: string
  email: string
  displayName: string
  role: Role
  teamId: string | null
  team: string | null
  jobTitle: string | null
  about: string | null
  /** Kennung des aktuellen Profilbildes, oder null. Traegt die Bild-URL. */
  avatarVersion: string | null
  autoRefreshSeconds: number
}

export const aktuellerNutzer = cache(async (): Promise<AngemeldeterNutzer | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      active: true,
      teamId: true,
      jobTitle: true,
      about: true,
      team: { select: { name: true } },
      // Nur die Version, nie die Bytes: die holt allein die Bild-Route.
      avatar: { select: { version: true } },
      settings: { select: { autoRefreshSeconds: true } },
    },
  })

  // Deaktivierte Konten gelten als abgemeldet, auch mit gueltigem Token.
  if (!user || !user.active) return null

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    teamId: user.teamId,
    team: user.team?.name ?? null,
    jobTitle: user.jobTitle,
    about: user.about,
    avatarVersion: user.avatar?.version ?? null,
    autoRefreshSeconds: user.settings?.autoRefreshSeconds ?? AKTUALISIERUNG_STANDARD,
  }
})

/** Fuer Seiten und Layouts: ohne Anmeldung geht es zurueck zum Login. */
export async function nutzerOderAnmeldung(): Promise<AngemeldeterNutzer> {
  const user = await aktuellerNutzer()
  if (!user) redirect('/login')
  return user
}

/**
 * Fuer Server Actions. Die sind ueber einen direkten POST erreichbar, nicht nur
 * ueber die eigene Oberflaeche – jede schreibende Funktion prueft deshalb selbst.
 */
export async function angemeldeterNutzer(): Promise<AngemeldeterNutzer> {
  const user = await aktuellerNutzer()
  if (!user) throw new Error('Nicht angemeldet')
  return user
}

/** Verwaltungsseiten. Wer keine Adminrolle hat, landet wieder auf der Uebersicht. */
export async function adminOderZurueck(): Promise<AngemeldeterNutzer> {
  const user = await nutzerOderAnmeldung()
  if (user.role !== 'ADMIN') redirect('/dashboard')
  return user
}

/** Dasselbe fuer Server Actions der Verwaltung. */
export async function angemeldeterAdmin(): Promise<AngemeldeterNutzer> {
  const user = await angemeldeterNutzer()
  if (user.role !== 'ADMIN') throw new Error('Keine Berechtigung')
  return user
}
