'use client'

import { useRef, useState, useTransition } from 'react'
import { ImageUp, Loader2, Trash2 } from 'lucide-react'
import { AVATAR_ACCEPT, AVATAR_KANTE } from '@/lib/avatar'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { avatarEntfernen, avatarSpeichern } from './actions'

/**
 * Profilbild waehlen.
 *
 * Zugeschnitten und verkleinert wird im Browser: ein Handyfoto hat mehrere
 * Megabyte, gebraucht wird ein 256er-Quadrat mit rund 30 KB. Das spart nicht
 * nur Platz – Server Actions nehmen ohnehin nur 1 MB entgegen, und eine
 * Bildbibliothek auf dem Server waere eine Abhaengigkeit mehr fuer eine
 * Aufgabe, die der Browser von sich aus kann.
 *
 * Das ist Bequemlichkeit, kein Schutz: was hier ankommt, prueft der Server
 * noch einmal vollstaendig (src/lib/avatar.ts).
 */

/** Grosszuegige Schranke, bevor ueberhaupt dekodiert wird. */
const QUELLE_MAX_BYTES = 20 * 1024 * 1024

async function alsQuadrat(datei: File): Promise<string> {
  const bitmap = await createImageBitmap(datei)
  try {
    const kante = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_KANTE
    canvas.height = AVATAR_KANTE

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('kein 2d-Kontext')

    // JPEG kennt keine Transparenz – ohne Grund waere ein freigestelltes PNG
    // hinterher schwarz hinterlegt.
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, AVATAR_KANTE, AVATAR_KANTE)

    // Mittiger Ausschnitt: das Gesicht sitzt auf Portraits fast immer in der Mitte.
    ctx.drawImage(
      bitmap,
      (bitmap.width - kante) / 2,
      (bitmap.height - kante) / 2,
      kante,
      kante,
      0,
      0,
      AVATAR_KANTE,
      AVATAR_KANTE,
    )

    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    bitmap.close()
  }
}

export function BildWaehler({
  userId,
  displayName,
  version,
}: {
  userId: string
  displayName: string
  version: string | null
}) {
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [vorschau, setVorschau] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function gewaehlt(datei: File | undefined) {
    setFehler(null)
    if (!datei) return

    if (datei.size > QUELLE_MAX_BYTES) {
      setFehler('Die Datei ist sehr groß. Bitte ein kleineres Bild wählen.')
      return
    }

    startTransition(async () => {
      let dataUrl: string
      try {
        dataUrl = await alsQuadrat(datei)
      } catch {
        setFehler('Dieses Bild ließ sich nicht öffnen. JPEG, PNG oder WebP funktionieren.')
        return
      }

      // Sofort zeigen, was gleich oben rechts stehen wird.
      setVorschau(dataUrl)
      const ergebnis = await avatarSpeichern(dataUrl)
      if (!ergebnis.ok) {
        setVorschau(null)
        setFehler(ergebnis.fehler)
      }
    })
  }

  function entfernen() {
    setFehler(null)
    startTransition(async () => {
      setVorschau(null)
      const ergebnis = await avatarEntfernen()
      if (!ergebnis.ok) setFehler(ergebnis.fehler)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative">
        {vorschau ? (
          // eslint-disable-next-line @next/next/no-img-element -- Vorschau aus einer Data-URL
          <img
            src={vorschau}
            alt=""
            width={96}
            height={96}
            className="bg-secondary size-24 shrink-0 rounded-full object-cover"
          />
        ) : (
          <Avatar userId={userId} displayName={displayName} version={version} groesse="lg" />
        )}

        {pending ? (
          <span className="bg-background/70 absolute inset-0 grid place-items-center rounded-full">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={dateiFeld}
            type="file"
            accept={AVATAR_ACCEPT}
            className="sr-only"
            aria-label="Bilddatei für das Profilbild wählen"
            onChange={(e) => {
              gewaehlt(e.target.files?.[0])
              // Damit dieselbe Datei nach einem Fehler erneut waehlbar bleibt.
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => dateiFeld.current?.click()}
          >
            <ImageUp />
            Bild wählen
          </Button>

          {version || vorschau ? (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={entfernen}>
              <Trash2 />
              Entfernen
            </Button>
          ) : null}
        </div>

        <p className="text-muted-foreground text-xs">
          Freiwillig. Wird auf {AVATAR_KANTE}×{AVATAR_KANTE} Pixel zugeschnitten und liegt in der
          Datenbank – ohne Bild stehen deine Initialen im Kreis.
        </p>

        {fehler ? (
          <p role="alert" className="text-destructive text-sm font-medium">
            {fehler}
          </p>
        ) : null}
      </div>
    </div>
  )
}
