import { AbgleichSkeleton } from '@/components/skeletons/abgleich-skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

export default function Loading() {
  return (
    <>
      <TableSkeleton rows={6} widths={['w-28', 'w-36', 'w-24', 'w-24', 'w-20', 'w-24']} />
      <div className="mt-6">
        <AbgleichSkeleton />
      </div>
    </>
  )
}
