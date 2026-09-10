import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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

/**
 * Die Rasterklassen stehen ausgeschrieben, nicht zusammengesetzt: Tailwind
 * liest die Klassennamen aus dem Quelltext, ein `lg:grid-cols-${n}` waere im
 * fertigen Stylesheet nicht enthalten.
 */
const SPALTEN: Record<number, string> = {
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

export function StatCardGridSkeleton({
  count = 4,
  columns = count,
}: {
  count?: number
  columns?: number
}) {
  return (
    <div className={cn('grid gap-4', SPALTEN[columns] ?? SPALTEN[4])}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}
