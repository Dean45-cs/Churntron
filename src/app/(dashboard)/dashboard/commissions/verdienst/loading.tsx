import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { VerdienstSkeleton } from '@/components/skeletons/verdienst-skeleton'

export default function Loading() {
  return (
    <>
      <VerdienstSkeleton />
      <div className="mt-6">
        <StatCardGridSkeleton />
      </div>
    </>
  )
}
