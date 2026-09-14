import { FormularSkeleton, HinweisKarteSkeleton } from '@/components/skeletons/formular-skeleton'

export default function Loading() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <FormularSkeleton felder={3} breiteSchaltflaeche="w-44" />
      <HinweisKarteSkeleton zeilen={2} />
    </div>
  )
}
