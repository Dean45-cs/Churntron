import { Suspense } from 'react'
import { devDelay } from '@/lib/dev'
import { getChurnKennzahlen, getOffeneChurnFaelle } from '@/lib/queries'
import { formatDate } from '@/lib/utils'
import { CANCEL_REASON_LABEL } from '@/lib/labels'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ContractStatusBadge } from '@/components/status-badge'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

const TABLE_WIDTHS = ['w-28', 'w-36', 'w-24', 'w-28', 'w-24', 'w-24']

export default function ChurnPage() {
  return (
    <>
      <PageHeader
        title="Churn-Leitfaden"
        description="Gekündigte und widerrufene Verträge mit Wiedervorlage. Der Gesprächsleitfaden steht unter „Gespräch“ – die Fassungen je Kündigungsgrund folgen."
      />

      <Suspense fallback={<StatCardGridSkeleton />}>
        <ChurnKennzahlen />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={<TableSkeleton rows={10} widths={TABLE_WIDTHS} />}>
          <ChurnTabelle />
        </Suspense>
      </div>
    </>
  )
}

async function ChurnKennzahlen() {
  await devDelay()
  const { gekuendigt, widerrufen, faellig, topGrund } = await getChurnKennzahlen()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Gekündigt" value={String(gekuendigt)} hint="offen zur Rückgewinnung" />
      <StatCard label="Widerrufen" value={String(widerrufen)} hint="innerhalb der Widerrufsfrist" />
      <StatCard label="Wiedervorlage fällig" value={String(faellig)} hint="jetzt angehen" accent />
      <StatCard
        label="Häufigster Grund"
        value={topGrund?.cancelReason ? CANCEL_REASON_LABEL[topGrund.cancelReason] : '—'}
        hint={topGrund ? `${topGrund._count} Verträge` : undefined}
      />
    </div>
  )
}

async function ChurnTabelle() {
  await devDelay(1500)
  const { contracts, gesamt } = await getOffeneChurnFaelle()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border flex-row items-center justify-between border-b pb-4">
        <CardTitle>Offene Fälle</CardTitle>
        <span className="text-muted-foreground text-sm">
          {contracts.length} von {gesamt}
        </span>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Vertrag</th>
              <th className="px-6 py-3 text-left font-semibold">Produkt</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Grund</th>
              <th className="px-6 py-3 text-left font-semibold">Wiedervorlage</th>
              <th className="px-6 py-3 text-left font-semibold">Betreuung</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {contracts.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-6 py-3.5 font-mono font-medium">{c.externalRef}</td>
                <td className="text-muted-foreground px-6 py-3.5">{c.product}</td>
                <td className="px-6 py-3.5">
                  <ContractStatusBadge status={c.status} />
                </td>
                <td className="px-6 py-3.5">
                  <span className="flex flex-col">
                    <span>{c.cancelReason ? CANCEL_REASON_LABEL[c.cancelReason] : '—'}</span>
                    {c.reasonRaw ? (
                      <span className="text-muted-foreground text-xs">
                        &bdquo;{c.reasonRaw}&ldquo;
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  {c.ueberfaellig ? (
                    <Badge variant="accentSubtle">{formatDate(c.reactivateAt)}</Badge>
                  ) : (
                    <span className="text-muted-foreground tabular">
                      {formatDate(c.reactivateAt)}
                    </span>
                  )}
                </td>
                <td className="text-muted-foreground px-6 py-3.5">{c.owner?.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
