import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Formgleich zum Leaderboard: Rangzahl, Avatar, Name, Punktzahl. */
export function LeaderboardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-44 rounded-lg" />
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
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    </Card>
  )
}
