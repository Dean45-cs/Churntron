import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getKontoDaten } from '@/lib/queries'
import { formatDate } from '@/lib/utils'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PasswortForm } from './passwort-form'

export default async function SicherheitPage() {
  const nutzer = await nutzerOderAnmeldung()
  await devDelay()
  const konto = await getKontoDaten(nutzer.id)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PasswortForm />

      <Card>
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Anmeldung</CardTitle>
          <CardDescription>
            Angemeldet als <span className="font-mono">{nutzer.email}</span>. Zuletzt am{' '}
            {konto.lastLoginAt ? formatDate(konto.lastLoginAt) : '—'}. Abmelden geht oben rechts.
          </CardDescription>
        </CardHeader>
        <div className="text-muted-foreground px-6 py-4 text-xs">
          Gespeichert wird nur der Zeitpunkt der letzten Anmeldung, kein Verlauf. Wer wann wie lange
          mit dem Werkzeug gearbeitet hat, hält Churntron nicht fest.
        </div>
      </Card>
    </div>
  )
}
