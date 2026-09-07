import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatCardGridSkeleton />
      <div className="mt-6">
        {/* Gleiche Spaltenbreiten wie die echte Tabelle in page.tsx */}
        <TableSkeleton rows={8} widths={['w-28', 'w-36', 'w-24', 'w-24', 'w-20']} />
      </div>
    </>
  )
}
