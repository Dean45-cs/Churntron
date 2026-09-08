import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { devDelay } from '@/lib/dev'
import { getArbeitsprofil, getTrackerStand } from '@/lib/queries'
import { periodenName } from '@/lib/period'
import { RechnerSkeleton } from '@/components/skeletons/rechner-skeleton'
import { RechnerForm } from './rechner-form'

/**
 * Brutto-Netto. Die Angaben liegen beim Nutzer, die Rechnung laeuft im Browser –
 * hier wird nur geladen, was schon bekannt ist, damit das Formular gefuellt
 * startet und nicht bei null.
 */
export default async function RechnerPage() {
  const session = await auth()

  return (
    <Suspense fallback={<RechnerSkeleton />}>
      <Rechner userId={session!.user.id} />
    </Suspense>
  )
}

async function Rechner({ userId }: { userId: string }) {
  await devDelay()
  const [profil, stand] = await Promise.all([getArbeitsprofil(userId), getTrackerStand(userId)])

  return (
    <RechnerForm
      profil={profil}
      provisionVorschlagCents={stand.periode.summeCents}
      periodenLabel={periodenName(stand.periode.schluessel)}
    />
  )
}
