'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Haelt die Seite von allein aktuell.
 *
 * Alle arbeiten schon auf derselben Datenbank – was fehlt, ist das Nachladen.
 * `router.refresh()` laesst die Server-Components neu laufen und tauscht nur
 * das Ergebnis aus: Eingaben in Formularen, die Scrollposition und die
 * optimistischen Zaehler im Tracker bleiben stehen.
 *
 * Bewusst kein Push ueber SSE oder WebSockets: dafuer braeuchte es einen
 * Vermittler zwischen den Server-Instanzen – auf Vercel also einen weiteren
 * Anbieter samt Auftragsverarbeitung. Nachfragen im Takt bringt hier fast
 * denselben Nutzen fuer einen Bruchteil des Aufwands (siehe PLAN.md, Stage 6).
 *
 * Zwei Ruecksichten:
 * - Im Hintergrund laufen die Fenster nicht weiter. Wer zehn Reiter offen hat,
 *   erzeugt sonst zehnmal Last fuer nichts.
 * - Der Takt gehoert dem Nutzer, "aus" eingeschlossen (Konto → Anzeige).
 */
export function AutoRefresh({ sekunden }: { sekunden: number }) {
  const router = useRouter()

  useEffect(() => {
    if (sekunden <= 0) return

    let takt: ReturnType<typeof setInterval> | undefined

    function anhalten() {
      if (takt) clearInterval(takt)
      takt = undefined
    }

    function starten() {
      anhalten()
      takt = setInterval(() => router.refresh(), sekunden * 1000)
    }

    function sichtbarkeit() {
      if (document.visibilityState === 'visible') {
        // Beim Zurueckkommen sofort nachziehen – wer wiederkommt, will den
        // aktuellen Stand sehen und nicht erst den naechsten Takt abwarten.
        router.refresh()
        starten()
      } else {
        anhalten()
      }
    }

    if (document.visibilityState === 'visible') starten()
    document.addEventListener('visibilitychange', sichtbarkeit)

    return () => {
      anhalten()
      document.removeEventListener('visibilitychange', sichtbarkeit)
    }
  }, [router, sekunden])

  return null
}
