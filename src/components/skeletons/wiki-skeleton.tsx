import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Ladezustand der Einwand-Wiki: Suchfeld, Themenfilter, Trefferliste.
 * Die Hoehen bilden die echten Bausteine nach – das Suchfeld ist h-13, eine
 * zugeklappte Trefferkarte misst rund 84 Pixel.
 */
export function WikiSucheSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <Skeleton className="h-13 flex-1 rounded-2xl" />
        <Skeleton className="h-13 w-24 rounded-2xl" />
      </div>

      <div className="flex gap-1.5">
        {['w-20', 'w-24', 'w-28', 'w-24', 'w-20', 'w-28'].map((w, i) => (
          <Skeleton key={i} className={`h-9 rounded-xl ${w}`} />
        ))}
      </div>

      <Skeleton className="h-4 w-56" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-2.5 px-6 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  )
}
