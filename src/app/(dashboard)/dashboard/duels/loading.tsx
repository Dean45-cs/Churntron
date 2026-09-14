import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import {
  DuelRanglisteSkeleton,
  MeineDuelleSkeleton,
} from '@/components/skeletons/duel-card-skeleton'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <MeineDuelleSkeleton />
      <div className="mt-6">
        <DuelRanglisteSkeleton />
      </div>
    </>
  )
}
