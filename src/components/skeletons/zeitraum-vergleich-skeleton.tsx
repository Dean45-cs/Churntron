import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Formgleich zu <ZeitraumVergleich/>: zwei Haelften mit derselben Mindesthoehe
 * (168px), Platzhalter fuer Bezeichnung, Betrag, Name, Spanne und Fortschritt.
 * Wenn sich dort die Hoehe aendert, muss sie hier mitwandern.
 */
export function ZeitraumVergleichSkeleton({ fussnote = false }: { fussnote?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-border grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex min-h-[168px] flex-col px-5 py-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-2.5 h-3 w-36" />
            <Skeleton className="mt-2 h-3 w-32" />
            <div className="mt-auto flex flex-col gap-2 pt-3">
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {fussnote ? (
        <div className="border-border border-t px-5 py-3">
          <Skeleton className="h-3 w-64" />
        </div>
      ) : null}
    </Card>
  )
}
