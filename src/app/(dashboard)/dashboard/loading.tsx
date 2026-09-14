import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { ActivityListSkeleton } from '@/components/skeletons/activity-list-skeleton'

/**
 * Route-Skeleton: greift beim Navigieren auf diese Seite, bevor ueberhaupt
 * eine Server-Component laeuft. Die Suspense-Grenzen in page.tsx uebernehmen
 * danach fuer die einzelnen Bloecke.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatCardGridSkeleton />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ActivityListSkeleton rows={5} />
        <ActivityListSkeleton rows={5} />
      </div>
    </>
  )
}
