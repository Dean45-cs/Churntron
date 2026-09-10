import Link from 'next/link'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getKontoDaten } from '@/lib/queries'
import { ROLE_LABEL } from '@/lib/labels'
import { formatDate, formatZahl } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BildWaehler } from './bild-waehler'
import { ProfilForm } from './profil-form'

/**
 * Das eigene Profil.
 *
 * Links, was man selbst bestimmt: Bild, Name, Funktion, Text. Rechts, was die
 * Verwaltung bestimmt: E-Mail, Rolle, Team. Die Trennung ist Absicht – wer
 * seine eigene Rolle setzen koennte, braucht keine Rollen.
 */
export default async function KontoPage() {
  const nutzer = await nutzerOderAnmeldung()
  await devDelay()
  const konto = await getKontoDaten(nutzer.id)

  const zeilen = [
    { label: 'E-Mail', wert: nutzer.email, mono: true },
    { label: 'Rolle', wert: ROLE_LABEL[nutzer.role], mono: false },
    { label: 'Team', wert: nutzer.team ?? 'ohne Team', mono: false },
    { label: 'Dabei seit', wert: formatDate(konto.createdAt), mono: false },
    {
      label: 'Zuletzt angemeldet',
      wert: konto.lastLoginAt ? formatDate(konto.lastLoginAt) : 'noch nie',
      mono: false,
    },
    { label: 'Gebuchte Positionen', wert: formatZahl(konto.buchungen), mono: true },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="border-border border-b pb-4">
            <CardTitle>Profilbild</CardTitle>
            <CardDescription>
              Es steht in der Topbar und überall dort, wo dein Name auftaucht.
            </CardDescription>
          </CardHeader>
          <div className="p-6">
            <BildWaehler
              userId={nutzer.id}
              displayName={nutzer.displayName}
              version={nutzer.avatarVersion}
            />
          </div>
        </Card>

        <ProfilForm
          displayName={nutzer.displayName}
          jobTitle={nutzer.jobTitle}
          about={nutzer.about}
        />
      </div>

      <Card className="h-fit">
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Konto</CardTitle>
          <CardDescription>Setzt die Verwaltung – nicht du selbst.</CardDescription>
        </CardHeader>

        <dl className="divide-border divide-y">
          {zeilen.map(({ label, wert, mono }) => (
            <div key={label} className="flex items-center justify-between gap-4 px-6 py-3">
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className={mono ? 'tabular font-mono text-sm' : 'text-sm font-medium'}>{wert}</dd>
            </div>
          ))}
        </dl>

        <div className="border-border border-t px-6 py-4">
          {nutzer.role === 'ADMIN' ? (
            <Link
              href="/dashboard/verwaltung/nutzer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Nutzer verwalten
            </Link>
          ) : (
            <p className="text-muted-foreground text-xs">
              E-Mail, Rolle oder Team falsch? <Badge variant="outline">Ausbilder fragen</Badge>
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
