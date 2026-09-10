import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Platzhalter fuer eine Datentabelle. `widths` bildet die Spaltenbreiten der
 * echten Tabelle nach – deshalb wird sie pro Einsatzort uebergeben und nicht
 * hier fest verdrahtet.
 */
export function TableSkeleton({
  rows = 8,
  widths = ['w-28', 'w-40', 'w-24', 'w-20', 'w-24'],
  title = true,
}: {
  rows?: number
  widths?: string[]
  title?: boolean
}) {
  return (
    <Card className="overflow-hidden">
      {title ? (
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-16" />
        </div>
      ) : null}

      <div className="border-border bg-muted/40 flex items-center gap-4 border-b px-6 py-3">
        {widths.map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>

      <div className="divide-border divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-6 py-3.5">
            {widths.map((w, c) => (
              <Skeleton key={c} className={`h-4 ${w}`} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}
