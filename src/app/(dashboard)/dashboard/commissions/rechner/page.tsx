import { Suspense } from 'react'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getArbeitsprofil, getTrackerStand } from '@/lib/queries'
import { RechnerSkeleton } from '@/components/skeletons/rechner-skeleton'
import { RechnerForm } from './rechner-form'

/**
 * Brutto-Netto. Die Angaben liegen beim Nutzer, die Rechnung laeuft im Browser –
 * hier wird nur geladen, was schon bekannt ist, damit das Formular gefuellt
 * startet und nicht bei null.
 */
export default async function RechnerPage() {
  const nutzer = await nutzerOderAnmeldung()

  return (
    <Suspense fallback={<RechnerSkeleton />}>
      <Rechner userId={nutzer.id} />
    </Suspense>
  )
}

async function Rechner({ userId }: { userId: string }) {
  await devDelay()
  const [profil, stand] = await Promise.all([getArbeitsprofil(userId), getTrackerStand(userId)])

  // Beide Zuschnitte zur Wahl, der Abrechnungszeitraum zuerst: das ist der
  // Betrag, der tatsaechlich ueberwiesen wird.
  return (
    <RechnerForm
      profil={profil}
      vorschlaege={[stand.periode, stand.monat].map((z) => ({
        art: z.art,
        label: `Gebucht im ${z.artLabel}`,
        spanne: z.spanne,
        cents: z.summeCents,
      }))}
    />
  )
}
