import { Skeleton } from '@/components/ui/skeleton'

/**
 * Formgleich zum Abwurffeld des Kampagnen-Lookups: dieselbe Hoehe
 * (2px gestrichelter Rand + py-16), damit beim Wechsel nichts springt.
 */
export function LookupDropSkeleton() {
  return (
    <div className="border-border bg-card rounded-2xl border-2 border-dashed px-6 py-16 text-center">
      <Skeleton className="mx-auto size-8 rounded-lg" />
      <Skeleton className="mx-auto mt-3 h-5 w-56" />
      <Skeleton className="mx-auto mt-2 h-4 w-72" />
      <Skeleton className="mx-auto mt-5 h-3 w-80" />
    </div>
  )
}
