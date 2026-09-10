import { TableSkeleton } from '@/components/skeletons/table-skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {[7, 13, 5].map((rows) => (
        <TableSkeleton key={rows} rows={rows} widths={['w-44', 'w-32', 'w-20']} />
      ))}
    </div>
  )
}
