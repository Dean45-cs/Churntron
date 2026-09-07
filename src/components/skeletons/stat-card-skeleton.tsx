import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Formgleich zu <StatCard/>: gleiche Kartenhoehe (116px), gleiche Abstaende,
 * Platzhalter in der Groesse von Label, Zahl und Hinweis. Damit springt beim
 * Wechsel von Skeleton auf echte Daten kein Pixel.
 */
export function StatCardSkeleton() {
  return (
    <Card className="h-[116px] px-5 py-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </Card>
  )
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}
