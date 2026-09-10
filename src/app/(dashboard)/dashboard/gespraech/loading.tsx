import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import { LeitfadenSkeleton } from '@/components/skeletons/leitfaden-skeleton'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <LeitfadenSkeleton />
    </>
  )
}
