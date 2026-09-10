import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Formgleich zum Rechner: links das Formular, rechts Ergebnis und Abrechnung. */
export function RechnerSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="border-border border-t px-6 py-4">
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex flex-col gap-2 p-6">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="mt-1 h-3 w-64" />
            <Skeleton className="mt-4 h-[104px] w-full rounded-2xl" />
          </div>
        </Card>

        <Card>
          <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="divide-border divide-y">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
