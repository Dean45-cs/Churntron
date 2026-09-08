import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

/** Formgleich zum Abgleich: Pruefformular mit Differenzkasten, darunter die Gruppen. */
export function AbgleichSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
            <Skeleton className="h-10 w-28 rounded-xl sm:col-span-3" />
          </div>
          <Skeleton className="h-[168px] w-full rounded-2xl" />
        </div>
      </Card>

      <TableSkeleton rows={7} widths={['w-40', 'w-16', 'w-14', 'w-16', 'w-20']} />
    </div>
  )
}
