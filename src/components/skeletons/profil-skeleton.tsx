import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FormularSkeleton } from '@/components/skeletons/formular-skeleton'

/** Formgleich zur Profilseite: links Bild und Formular, rechts die Kontodaten. */
export function ProfilSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="flex flex-col gap-6">
        <Card>
          <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="flex items-center gap-5 p-6">
            <Skeleton className="size-24 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-32 rounded-xl" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </Card>

        <FormularSkeleton felder={3} />
      </div>

      <Card className="h-fit">
        <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="divide-border divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
        <div className="border-border border-t px-6 py-4">
          <Skeleton className="h-3 w-52" />
        </div>
      </Card>
    </div>
  )
}
