import { cn } from '@/lib/utils'

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number
  className?: string
  indicatorClassName?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('bg-muted h-2 w-full overflow-hidden rounded-full', className)}
    >
      <div
        className={cn(
          'bg-primary h-full rounded-full transition-[width] duration-500',
          indicatorClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
