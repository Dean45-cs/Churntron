import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn, formatEuro } from '@/lib/utils'
import type { ZeitraumStand } from '@/lib/zeitraum'

/**
 * Kalendermonat und Abrechnungszeitraum nebeneinander.
 *
 * Die beiden Zahlen sind unterschiedlich, und das ist kein Fehler: der
 * Kalendermonat beantwortet „was habe ich im September gemacht", der
 * Abrechnungszeitraum „was steht auf der naechsten Abrechnung". Wer nur eine
 * von beiden sieht, haelt sie fuer die andere – deshalb stehen sie immer
 * zusammen, jede mit ihrer Spanne darunter.
 *
 * Die Karte bekommt fertige Werte: Prozent, Resttage und Beschriftung sind
 * gerechnet, hier wird kein Datum mehr angefasst.
 */

export type ZeitraumKarte = ZeitraumStand & {
  summeCents: number
  anzahl: number
  /** Nur der Abrechnungszeitraum wird ausgezahlt – fertig formatiert. */
  auszahlungAm?: string | null
}

export function ZeitraumVergleich({
  zeitraeume,
  fussnote,
}: {
  zeitraeume: ZeitraumKarte[]
  fussnote?: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-border grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {zeitraeume.map((z) => (
          <ZeitraumBlock key={z.art} zeitraum={z} />
        ))}
      </div>
      {fussnote ? (
        <div className="border-border text-muted-foreground border-t px-5 py-3 text-xs">
          {fussnote}
        </div>
      ) : null}
    </Card>
  )
}

function ZeitraumBlock({ zeitraum: z }: { zeitraum: ZeitraumKarte }) {
  const laeuft = z.restTage > 0

  return (
    <div className="flex min-h-[168px] flex-col gap-1 px-5 py-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {z.artLabel}
      </p>
      <p className="tabular text-3xl font-semibold">{formatEuro(z.summeCents)}</p>
      <p className="text-muted-foreground text-xs">
        {z.name} · {z.anzahl} Vorgänge
      </p>
      <p className="text-muted-foreground tabular mt-0.5 font-mono text-xs">{z.spanne}</p>

      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        <Progress
          value={z.prozent}
          className="h-1.5"
          indicatorClassName={cn(!laeuft && 'bg-success')}
        />
        <p className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs">
          <span>
            {laeuft ? `noch ${z.restTage} ${z.restTage === 1 ? 'Tag' : 'Tage'}` : 'abgeschlossen'}
          </span>
          {z.auszahlungAm ? (
            <span>
              Auszahlung am <span className="tabular font-mono">{z.auszahlungAm}</span>
            </span>
          ) : (
            <span>{z.prozent} % vorbei</span>
          )}
        </p>
      </div>
    </div>
  )
}
