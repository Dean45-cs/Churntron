import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

/**
 * Formgleich zu <Leitfaden/> in der breiten Ansicht: Kopf mit Reitern, links
 * die Phasenliste, rechts der Inhalt, unten die Leitplanken.
 *
 * Der Leitfaden holt keine Daten – er liest aus src/lib/leitfaden.ts. Zu warten
 * gibt es hier nur auf die Runde zum Server, die das Segment holt: auf dem
 * eigenen Rechner sind das Millisekunden, ueber eine echte Leitung nicht. Das
 * Skeleton faengt genau diese Luecke ab, wie in jedem anderen Segment auch.
 */
export function LeitfadenSkeleton() {
  return (
    <Card className="flex h-[calc(100dvh-14rem)] min-h-[34rem] flex-col overflow-hidden">
      <div className="border-border border-b px-6 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-1.5 h-3.5 w-56" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="mt-3 flex gap-1">
          <Skeleton className="h-9 w-20 rounded-t-xl" />
          <Skeleton className="h-9 w-24 rounded-t-xl" />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-[13.5rem_minmax(0,1fr)]">
        <div className="border-border bg-muted/30 flex flex-col gap-0.5 border-r px-3 py-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="mt-1.5 h-6 w-64" />
            <Skeleton className="mt-3 h-4 w-full max-w-lg" />
          </div>
          {/* Ein O-Ton-Block, zwei Textbloecke – die uebliche Mischung. */}
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>

      <div className="border-border bg-muted/40 border-t px-6 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-1.5 h-3.5 w-full max-w-2xl" />
      </div>
    </Card>
  )
}
