import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Formgleich zur Aktivitaetenliste auf der Uebersicht. */
export function ActivityListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-border border-b px-6 py-4">
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="divide-border divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-3.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="mt-1.5 h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  )
}
