import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCardSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'
import { ZeitraumVergleichSkeleton } from '@/components/skeletons/zeitraum-vergleich-skeleton'

const SCHNITT_WIDTHS = ['w-28', 'w-20', 'w-20', 'w-40']

/**
 * Formgleich zur Auswertung: vier Kacheln, die Gegenueberstellung von
 * Kalendermonat und Abrechnungszeitraum, Schnitt-Tabelle, zwei Diagramme.
 */
export function VerdienstSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <ZeitraumVergleichSkeleton />

      <TableSkeleton rows={8} widths={SCHNITT_WIDTHS} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6 pb-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
          <div className="flex h-44 items-end gap-2 px-6 pb-6">
            {[
              'h-16',
              'h-24',
              'h-20',
              'h-32',
              'h-28',
              'h-36',
              'h-24',
              'h-40',
              'h-28',
              'h-32',
              'h-36',
              'h-20',
            ].map((h, i) => (
              <Skeleton key={i} className={`flex-1 ${h} rounded-t-[4px]`} />
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-2 px-6 pt-6 pb-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-60" />
          </div>
          <div className="flex flex-col gap-4 px-6 pb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <TableSkeleton rows={6} widths={['w-40', 'w-16', 'w-20', 'w-16']} />
    </div>
  )
}
