import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { devDelay } from '@/lib/dev'
import { formatEuro } from '@/lib/utils'
import { getProvisionsKennzahlen, getProvisionen, getTeamProvisionen } from '@/lib/queries'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CommissionStatusBadge } from '@/components/status-badge'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

const TABLE_WIDTHS = ['w-28', 'w-36', 'w-24', 'w-24', 'w-20']
const TEAM_WIDTHS = ['w-32', 'w-24', 'w-20', 'w-24']

export default async function CommissionsPage() {
  const session = await auth()
  const isAdmin = session?.user.role === 'ADMIN'

  return (
    <>
      <PageHeader
        title="Provisionen"
        description="Laufende Provisionen je Vertrag. Das Provisionsmodell liegt als Regel in der Datenbank – Staffeln und Boni kommen in Termin 2 dazu."
      />

      <Suspense fallback={<StatCardGridSkeleton />}>
        <ProvisionsKennzahlen />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={<TableSkeleton rows={8} widths={TABLE_WIDTHS} />}>
          <ProvisionsTabelle isAdmin={isAdmin} userId={session?.user.id} />
        </Suspense>
      </div>

      {/* Nur fuer Ausbilder und Teamleitung – laedt unabhaengig vom Rest. */}
      {isAdmin ? (
        <div className="mt-6">
          <Suspense fallback={<TableSkeleton rows={6} widths={TEAM_WIDTHS} />}>
            <TeamUebersicht />
          </Suspense>
        </div>
      ) : null}
    </>
  )
}

async function ProvisionsKennzahlen() {
  await devDelay()
  const { offen, genehmigt, ausgezahlt, storno } = await getProvisionsKennzahlen()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Offen"
        value={formatEuro(offen._sum.amountCents ?? 0)}
        hint={`${offen._count} Positionen`}
        accent
      />
      <StatCard
        label="Genehmigt"
        value={formatEuro(genehmigt._sum.amountCents ?? 0)}
        hint={`${genehmigt._count} Positionen`}
      />
      <StatCard
        label="Ausgezahlt"
        value={formatEuro(ausgezahlt._sum.amountCents ?? 0)}
        hint={`${ausgezahlt._count} Positionen`}
      />
      <StatCard
        label="Storno"
        value={formatEuro(storno._sum.amountCents ?? 0)}
        hint={`${storno._count} Positionen`}
      />
    </div>
  )
}

async function ProvisionsTabelle({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) {
  await devDelay(1400)
  const commissions = await getProvisionen({ alle: isAdmin, userId })

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border flex-row items-center justify-between border-b pb-4">
        <CardTitle>{isAdmin ? 'Alle Provisionen' : 'Meine Provisionen'}</CardTitle>
        <span className="text-muted-foreground text-sm">{commissions.length} Positionen</span>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Vertrag</th>
              <th className="px-6 py-3 text-left font-semibold">Regel</th>
              <th className="px-6 py-3 text-left font-semibold">Monat</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-right font-semibold">Betrag</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {commissions.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-6 py-3.5 font-mono font-medium">{c.contract.externalRef}</td>
                <td className="text-muted-foreground px-6 py-3.5">{c.rule?.name ?? '—'}</td>
                <td className="text-muted-foreground tabular px-6 py-3.5 font-mono">
                  {c.periodMonth}
                </td>
                <td className="px-6 py-3.5">
                  <CommissionStatusBadge status={c.status} />
                </td>
                <td className="tabular px-6 py-3.5 text-right font-semibold">
                  {formatEuro(c.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

async function TeamUebersicht() {
  await devDelay(2100)
  const rows = await getTeamProvisionen()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border border-b pb-4">
        <CardTitle>Team-Übersicht</CardTitle>
        <CardDescription>Nur für Ausbilder und Teamleitung sichtbar.</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Vertriebler</th>
              <th className="px-6 py-3 text-left font-semibold">Team</th>
              <th className="px-6 py-3 text-right font-semibold">Positionen</th>
              <th className="px-6 py-3 text-right font-semibold">Summe</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((r) => (
              <tr key={r.userId} className="hover:bg-muted/30">
                <td className="px-6 py-3.5 font-medium">{r.user?.displayName}</td>
                <td className="text-muted-foreground px-6 py-3.5">{r.user?.team?.name ?? '—'}</td>
                <td className="tabular px-6 py-3.5 text-right">{r.anzahl}</td>
                <td className="tabular px-6 py-3.5 text-right font-semibold">
                  {formatEuro(r.summeCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
