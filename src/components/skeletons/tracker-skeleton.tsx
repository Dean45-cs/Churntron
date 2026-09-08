import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'

/**
 * Ladezustand des Tastenfeldes. Die Kacheln haben dieselbe Hoehe wie die
 * echten Tasten (min-h-[72px]) und dieselbe Rasterbreite – sonst springt das
 * Bild, sobald die Daten da sind.
 */
export function TrackerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <StatCardGridSkeleton />

      <Card>
        <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64" />
        </div>

        <div className="border-border flex gap-2 border-b px-4 py-2">
          {['w-28', 'w-20', 'w-24', 'w-20', 'w-28'].map((w, i) => (
            <Skeleton key={i} className={`h-9 ${w} rounded-xl`} />
          ))}
        </div>

        <div className="p-4">
          <Skeleton className="mb-3 ml-1 h-3 w-40" />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-border flex items-center justify-between border-b px-6 py-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="divide-border divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3.5">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="ml-auto h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
