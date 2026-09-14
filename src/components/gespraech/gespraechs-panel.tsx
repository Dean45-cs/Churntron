'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { Headset, X } from 'lucide-react'
import { Leitfaden } from '@/components/gespraech/leitfaden'
import { SCHLUESSEL, abonniere, lies, schreibe } from '@/lib/gespraech-speicher'
import { cn } from '@/lib/utils'

/**
 * Die Schublade mit dem Leitfaden.
 *
 * Sie haengt im Dashboard-Layout und nicht in einer Seite: das Layout bleibt
 * beim Wechsel zwischen Provisionen, Churn und Challenges montiert, die
 * Schublade also offen und an derselben Phase. Genau darum ging es – waehrend
 * eines Gespraechs soll der Leitfaden nicht verschwinden, nur weil man
 * nebenbei eine Provision bucht.
 *
 * Bewusst ohne abdunkelnden Hintergrund und ohne Schliessen beim Klick
 * daneben: der Rest der Oberflaeche bleibt benutzbar, waehrend die Schublade
 * offen steht. Sie ist kein Dialog, sie ist ein Beifahrersitz.
 */

/** Auf der eigenen Seite des Leitfadens braucht es die Schublade nicht. */
const EIGENE_SEITE = '/dashboard/gespraech'

export function GespraechsPanel() {
  const pathname = usePathname()

  // Serverseitig zu, danach der gemerkte Stand – siehe gespraech-speicher.ts.
  const offen = useSyncExternalStore(
    abonniere,
    () => lies('dauerhaft', SCHLUESSEL.offen, '0') === '1',
    () => false,
  )

  const umschalten = useCallback((ziel: boolean) => {
    schreibe('dauerhaft', SCHLUESSEL.offen, ziel ? '1' : '0')
  }, [])

  useEffect(() => {
    if (!offen) return
    function beiTaste(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const ziel = e.target as HTMLElement | null
      // In einem Eingabefeld gehoert Esc dem Feld.
      if (ziel && /^(INPUT|TEXTAREA|SELECT)$/.test(ziel.tagName)) return
      umschalten(false)
    }
    window.addEventListener('keydown', beiTaste)
    return () => window.removeEventListener('keydown', beiTaste)
  }, [offen, umschalten])

  if (pathname === EIGENE_SEITE) return null

  return (
    <>
      {/* Der Griff am rechten Rand – schmal, damit er nichts verdeckt. */}
      <button
        type="button"
        onClick={() => umschalten(true)}
        aria-expanded={offen}
        aria-controls="gespraechs-schublade"
        className={cn(
          'bg-primary text-primary-foreground fixed top-1/2 right-0 z-20 flex -translate-y-1/2 items-center gap-2 rounded-l-xl py-4 pr-1.5 pl-2 shadow-[var(--shadow-soft)] transition-transform',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          offen && 'pointer-events-none translate-x-full',
        )}
      >
        <Headset className="size-4 shrink-0" />
        <span className="text-xs font-semibold [writing-mode:vertical-rl]">Leitfaden</span>
      </button>

      <aside
        id="gespraechs-schublade"
        aria-label="Gesprächsleitfaden"
        inert={!offen}
        className={cn(
          'bg-popover text-popover-foreground border-border fixed inset-y-0 right-0 z-20 flex w-full max-w-[26rem] flex-col border-l shadow-[var(--shadow-soft)] transition-transform duration-200',
          offen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Der Leitfaden horcht nur auf Tasten, solange die Schublade offen ist. */}
        <Leitfaden
          tastaturAktiv={offen}
          kopfAktion={
            <button
              type="button"
              onClick={() => umschalten(false)}
              aria-label="Leitfaden schließen"
              title="Schließen (Esc)"
              className="hover:bg-secondary grid size-9 place-items-center rounded-xl"
            >
              <X className="size-4" />
            </button>
          }
        />
      </aside>
    </>
  )
}
