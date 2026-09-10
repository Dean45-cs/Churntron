import { Skeleton } from '@/components/ui/skeleton'

/** Formgleich zu <PageHeader/>. */
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2.5 h-4 w-80" />
      </div>
      {withAction ? <Skeleton className="h-10 w-36 rounded-xl" /> : null}
    </div>
  )
}
