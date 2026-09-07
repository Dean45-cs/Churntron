import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Formgleich zur echten Challenge-Karte inklusive Fortschrittsbalken. */
export function ChallengeCardSkeleton() {
  return (
    <Card className="flex h-[210px] flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-3/5" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-3 h-3 w-32" />
      </div>
    </Card>
  )
}

export function ChallengeGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ChallengeCardSkeleton key={i} />
      ))}
    </div>
  )
}
