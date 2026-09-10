import { Suspense } from 'react'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getKatalog, getTrackerStand } from '@/lib/queries'
import { TrackerSkeleton } from '@/components/skeletons/tracker-skeleton'
import { Tracker } from './tracker'

/**
 * Die Startseite des Provisionsmoduls: buchen, was gerade fertig geworden ist.
 * Alles Weitere (Auswertung, Rechner, Abgleich) liegt hinter den Reitern.
 */
export default async function CommissionsPage() {
  const nutzer = await nutzerOderAnmeldung()
  const userId = nutzer.id

  return (
    <Suspense fallback={<TrackerSkeleton />}>
      <TrackerBereich userId={userId} />
    </Suspense>
  )
}

async function TrackerBereich({ userId }: { userId: string }) {
  await devDelay()
  const [gruppen, stand] = await Promise.all([getKatalog(), getTrackerStand(userId)])
  return <Tracker gruppen={gruppen} stand={stand} />
}
