import { FormularSkeleton, HinweisKarteSkeleton } from '@/components/skeletons/formular-skeleton'

export default function Loading() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <FormularSkeleton felder={1} breiteSchaltflaeche="w-32" />
      <HinweisKarteSkeleton zeilen={3} />
      <HinweisKarteSkeleton zeilen={2} />
    </div>
  )
}
