import { adminOderZurueck } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getNutzerListe, getTeams } from '@/lib/queries'
import { PageHeader } from '@/components/page-header'
import { NeuerNutzerForm } from './neuer-nutzer-form'
import { NutzerTabelle } from './nutzer-tabelle'

/**
 * Nutzerverwaltung.
 *
 * Der Zugang haengt an der Rolle in der Datenbank, nicht an einem Token –
 * adminOderZurueck() schickt alle anderen zurueck auf die Uebersicht. Die
 * Server Actions daneben pruefen dasselbe noch einmal selbst, denn sie sind
 * auch ohne diese Seite erreichbar.
 */
export default async function NutzerPage() {
  const admin = await adminOderZurueck()
  await devDelay()
  const [nutzer, teams] = await Promise.all([getNutzerListe(), getTeams()])

  return (
    <>
      <PageHeader
        title="Nutzer"
        description="Konten anlegen, Rolle und Team setzen, Passwörter zurücksetzen."
      />

      <div className="flex flex-col gap-6">
        <NutzerTabelle
          eigeneId={admin.id}
          teams={teams}
          nutzer={nutzer.map((n) => ({
            id: n.id,
            email: n.email,
            displayName: n.displayName,
            role: n.role,
            active: n.active,
            teamId: n.teamId,
            lastLoginAt: n.lastLoginAt,
            avatarVersion: n.avatar?.version ?? null,
            buchungen: n._count.commissions,
          }))}
        />

        <NeuerNutzerForm teams={teams} />
      </div>
    </>
  )
}
