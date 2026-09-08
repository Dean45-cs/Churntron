import { cn, formatEuro } from '@/lib/utils'

/**
 * Zwei kleine Diagramme, gebaut aus den Design-Tokens – ohne Chart-Bibliothek.
 *
 * Bewusst je EINE Datenreihe und damit eine einzige Farbe: es geht um
 * Groessenordnungen, nicht um Identitaet. Wo eine Farbe reicht, braucht es
 * keine Legende, und die Regel "Text traegt Textfarben, nur die Balken tragen
 * die Datenfarbe" bleibt von selbst eingehalten.
 *
 * Beschriftet wird sparsam: der laufende bzw. groesste Wert steht am Balken,
 * alles andere haengt am Hover-Titel und steht ausserdem in den Tabellen
 * darunter. Eine Zahl an jeder Saeule liest niemand.
 */

export type Saeule = { label: string; wert: number; hinweis: string; hervorheben?: boolean }

export function MonatsSaeulen({ daten }: { daten: Saeule[] }) {
  const max = Math.max(1, ...daten.map((d) => d.wert))

  return (
    <figure className="m-0">
      <div className="flex h-44 items-end gap-2" role="list">
        {daten.map((d) => {
          const hoehe = Math.max(2, Math.round((d.wert / max) * 100))
          return (
            <div
              key={d.label}
              role="listitem"
              title={`${d.label}: ${d.hinweis}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              {d.hervorheben ? (
                <span className="tabular text-accent font-mono text-[11px] font-semibold">
                  {d.hinweis}
                </span>
              ) : null}
              <div
                // Saeule: oben 4px gerundet, unten buendig auf der Grundlinie.
                className={cn(
                  'w-full max-w-[24px] rounded-t-[4px]',
                  d.hervorheben ? 'bg-accent' : 'bg-primary/80',
                )}
                style={{ height: `${hoehe}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* Grundlinie: eine Haarlinie, nicht gestrichelt, zurueckhaltend. */}
      <div className="bg-border mt-0 h-px w-full" />

      <figcaption className="text-muted-foreground mt-2 flex gap-2 text-[11px]">
        {daten.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 text-center">
            {d.label.slice(0, 3)}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

export type Anteil = { label: string; wert: number; hinweis?: string }

/** Waagerechte Balken fuer Anteile mit langen Namen – lesbarer als ein Kuchen. */
export function AnteilsBalken({ daten }: { daten: Anteil[] }) {
  const max = Math.max(1, ...daten.map((d) => d.wert))

  return (
    <ul className="flex flex-col gap-3">
      {daten.map((d) => (
        <li key={d.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-sm font-medium">{d.label}</span>
          <span className="tabular font-mono text-sm font-semibold">{formatEuro(d.wert)}</span>
          <div className="bg-muted col-span-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.max(2, Math.round((d.wert / max) * 100))}%` }}
            />
          </div>
          {d.hinweis ? (
            <span className="text-muted-foreground col-span-2 -mt-0.5 text-xs">{d.hinweis}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
