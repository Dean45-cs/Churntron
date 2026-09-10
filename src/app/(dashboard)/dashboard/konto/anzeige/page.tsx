import Link from 'next/link'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnzeigeForm } from './anzeige-form'

export default async function AnzeigePage() {
  const nutzer = await nutzerOderAnmeldung()
  await devDelay()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <AnzeigeForm autoRefreshSeconds={nutzer.autoRefreshSeconds} />

      <Card>
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Helles und dunkles Design</CardTitle>
          <CardDescription>
            Der Umschalter sitzt oben rechts. Die Auswahl gilt für dieses Gerät und wird bewusst
            nicht im Konto gespeichert: sie muss stehen, bevor die erste Zeile geladen ist – sonst
            blitzt beim Öffnen die helle Seite auf.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Wochenstunden und Steuermerkmale</CardTitle>
          <CardDescription>
            Sie tragen den Stundenschnitt und den Brutto-Netto-Rechner und stehen deshalb dort, wo
            man sie braucht.
          </CardDescription>
        </CardHeader>
        <div className="px-6 py-4">
          <Link
            href="/dashboard/commissions/rechner"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Zum Brutto-Netto-Rechner
          </Link>
        </div>
      </Card>
    </div>
  )
}
