/**
 * Die laufende Minute als externer Speicher.
 *
 * Der Fortschritt braucht „jetzt": ohne das gaebe es kein „in der letzten
 * Stunde". Die Uhr gehoert React aber genauso wenig wie der localStorage –
 * sie laeuft weiter, ob gerendert wird oder nicht. Deshalb haengt die
 * Oberflaeche ueber `useSyncExternalStore` daran, statt `Date.now()` im
 * Render-Pfad aufzurufen (AGENTS.md, Server und Client) oder es per Effekt
 * in einen State zu schieben (`react-hooks/set-state-in-effect`).
 *
 * Aufgeloest wird bewusst nur minutenweise. Ein Zaehler, der jede Sekunde die
 * ganze Kartenliste neu rendert, waere fuer „noch ca. 2 h" verschwendete Arbeit.
 */

const MINUTE_MS = 60_000

let stand = 0
const hoerer = new Set<() => void>()
let takt: ReturnType<typeof setInterval> | null = null

/**
 * Muss zwischen zwei Benachrichtigungen denselben Wert liefern, sonst rendert
 * React endlos. Deshalb wird der gemerkte Stand nur dann nachgezogen, wenn er
 * wirklich aelter als eine Minute ist – das faengt zugleich den Fall ab, dass
 * die Seite lange im Hintergrund lag und der Takt ausgesetzt hat.
 */
export function jetztMinute(): number {
  const echt = Date.now()
  if (echt - stand >= MINUTE_MS) stand = echt
  return stand
}

/** Auf dem Server gibt es keine laufende Uhr – ein fester Wert. */
export function serverMinute(): number {
  return 0
}

export function abonniereMinute(fn: () => void): () => void {
  hoerer.add(fn)
  takt ??= setInterval(() => {
    stand = Date.now()
    hoerer.forEach((f) => f())
  }, MINUTE_MS)

  return () => {
    hoerer.delete(fn)
    if (!hoerer.size && takt) {
      clearInterval(takt)
      takt = null
    }
  }
}
