import { db } from '@/lib/db'
import { aktuellerNutzer } from '@/lib/session'

/**
 * Liefert ein Profilbild aus.
 *
 * Die Middleware laesst /api bewusst durch (siehe middleware.ts), also prueft
 * diese Route die Anmeldung selbst. Bilder von Kolleginnen und Kollegen darf
 * sehen, wer angemeldet ist – oeffentlich ist hier nichts.
 *
 * Die Adresse traegt die Version des Bildes als Parameter. Passt sie zum
 * gespeicherten Stand, darf der Browser das Bild dauerhaft behalten; fragt
 * jemand mit einer alten Version, kommt trotzdem das aktuelle Bild, dann aber
 * ohne Ewigkeitsversprechen.
 */
export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const nutzer = await aktuellerNutzer()
  if (!nutzer) return new Response('Nicht angemeldet', { status: 401 })

  const { userId } = await params
  const avatar = await db.userAvatar.findUnique({ where: { userId } })
  if (!avatar) return new Response('Kein Profilbild', { status: 404 })

  const etag = `"${avatar.version}"`
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  const gefragt = new URL(request.url).searchParams.get('v')
  const aktuell = gefragt === avatar.version

  return new Response(new Uint8Array(avatar.data), {
    headers: {
      'Content-Type': avatar.mimeType,
      ETag: etag,
      // Ein Profilbild ist ein Beschaeftigtendatum: "private" haelt es aus
      // Zwischenspeichern heraus, die mehreren Leuten dienen.
      'Cache-Control': aktuell
        ? 'private, max-age=31536000, immutable'
        : 'private, max-age=0, must-revalidate',
      // Der Typ steht fest – der Browser soll nicht selbst raten.
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
