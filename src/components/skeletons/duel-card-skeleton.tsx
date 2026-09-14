import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'

/**
 * Formgleich zur echten Duell-Karte: Badge-Zeile, Frage, die beiden Seiten mit
 * Avataren und der Balken des Tauziehens. Die Karte waechst mit ihrem Inhalt,
 * deshalb steht hier keine feste Hoehe – die Innenabstaende und Zeilenhoehen
 * sind dieselben wie in duell-karte.tsx.
 */
export function DuelCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="ml-auto h-4 w-20" />
      </div>

      <div>
        <Skeleton className="h-5 w-52" />
        <Skeleton className="mt-2 h-3 w-40" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={i === 1 ? 'flex flex-col items-end gap-2' : 'flex flex-col gap-2'}
          >
            <Skeleton className="h-8 w-24" />
            <div
              className={
                i === 1 ? 'flex flex-row-reverse items-center gap-2' : 'flex items-center gap-2'
              }
            >
              <Skeleton className="size-7 rounded-full" />
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1 h-3 w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-2.5 w-full rounded-full" />
      <Skeleton className="h-4 w-48" />
    </Card>
  )
}

export function DuelGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <DuelCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Formgleich zur Duell-Rangliste: Rang, Avatar, Name, Bilanz. */
export function DuelRanglisteSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <div className="divide-border divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-3.5">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1.5 h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Der ganze obere Block der Duell-Seite: Kennzahlen, die Taste zum Ausrufen
 * und die Karten. Er steckt in einer einzigen Suspense-Grenze, weil die drei
 * Teile aus derselben Abfrage kommen – getrennt zu laden brächte nichts.
 */
export function MeineDuelleSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <StatCardGridSkeleton count={3} />
      <Skeleton className="h-10 w-40 rounded-xl" />
      <div>
        <Skeleton className="mb-3 h-3 w-32" />
        <DuelGridSkeleton />
      </div>
    </div>
  )
}
