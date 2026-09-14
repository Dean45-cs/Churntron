import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import { LookupDropSkeleton } from '@/components/skeletons/lookup-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      {/* Formgleich zum Datenschutz-Hinweis in page.tsx */}
      <Skeleton className="mb-6 h-[62px] rounded-2xl" />
      <LookupDropSkeleton />
    </>
  )
}
