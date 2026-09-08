import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { WikiSucheSkeleton } from '@/components/skeletons/wiki-skeleton'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatCardGridSkeleton count={3} />
      <div className="mt-6">
        <WikiSucheSkeleton />
      </div>
    </>
  )
}
