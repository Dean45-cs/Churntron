import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import { FormularSkeleton } from '@/components/skeletons/formular-skeleton'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />

      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden">
          <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-80" />
          </div>
          <div className="divide-border divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-9 w-44 rounded-xl" />
                <Skeleton className="h-9 w-36 rounded-xl" />
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="size-9 rounded-xl" />
              </div>
            ))}
          </div>
        </Card>

        <FormularSkeleton felder={3} breiteSchaltflaeche="w-36" />
      </div>
    </>
  )
}
