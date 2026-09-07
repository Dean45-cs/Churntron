import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Kennzahlkarte. Die Masse hier und im StatCardSkeleton muessen
 * zusammenpassen – siehe Kommentar in components/skeletons/stat-card-skeleton.tsx.
 */
export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <Card className="h-[116px] px-5 py-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
      <p
        className={cn(
          'tabular mt-2 text-3xl font-semibold',
          // Orange nur fuer die eine Zahl, auf die es gerade ankommt.
          accent ? 'text-accent' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </Card>
  )
}
