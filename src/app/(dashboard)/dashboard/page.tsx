import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { devDelay } from '@/lib/dev'
import { formatEuro, formatDate } from '@/lib/utils'
import { ACTIVITY_TYPE_LABEL, ACTIVITY_OUTCOME_LABEL, CANCEL_REASON_LABEL } from '@/lib/labels'
import {
  getUebersichtKennzahlen,
  getFaelligeWiedervorlagen,
  getLetzteAktivitaeten,
} from '@/lib/queries'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { ActivityListSkeleton } from '@/components/skeletons/activity-list-skeleton'

export default function DashboardPage() {
  // Der Kopf steht sofort. Jede datenabrufende Einheit steckt in einer eigenen
  // Suspense-Grenze und laedt fuer sich – so wartet nie die ganze Seite auf die
  // langsamste Abfrage.
  return (
    <>
      <PageHeader title="Übersicht" description="Der aktuelle Stand über alle drei Bereiche." />

      <Suspense fallback={<StatCardGridSkeleton />}>
        <Kennzahlen />
      </Suspense>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<ActivityListSkeleton rows={5} />}>
          <Wiedervorlagen />
        </Suspense>
        <Suspense fallback={<ActivityListSkeleton rows={5} />}>
          <LetzteAktivitaeten />
        </Suspense>
      </div>
    </>
  )
}

async function Kennzahlen() {
  await devDelay()
  const k = await getUebersichtKennzahlen()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Offene Kündigungen"
        value={String(k.offen)}
        hint="gekündigt oder widerrufen"
      />
      <StatCard
        label="Rückgewinnungsquote"
        value={`${k.quote} %`}
        hint={`${k.zurueck} von ${k.bearbeitet} abgeschlossen`}
        accent
      />
      <StatCard
        label="Provision offen"
        value={formatEuro(k.provisionOffenCents)}
        hint="offen und genehmigt"
      />
      <StatCard
        label="Punkte (30 Tage)"
        value={String(k.punkte30Tage)}
        hint="alle Vertriebler zusammen"
      />
    </div>
  )
}

async function Wiedervorlagen() {
  await devDelay(1300)
  const faellig = await getFaelligeWiedervorlagen()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border flex-row items-center justify-between border-b pb-4">
        <CardTitle>Wiedervorlage fällig</CardTitle>
        <Link href="/dashboard/churn" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Alle <ArrowRight />
        </Link>
      </CardHeader>

      {faellig.length === 0 ? (
        <p className="text-muted-foreground px-6 py-8 text-sm">Aktuell nichts fällig. Sauber.</p>
      ) : (
        <ul className="divide-border divide-y">
          {faellig.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-6 py-3.5">
              <span className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                <CalendarClock className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-medium">{c.externalRef}</p>
                <p className="text-muted-foreground text-xs">
                  {c.product} · {formatDate(c.reactivateAt)}
                </p>
              </div>
              <Badge variant="outline">
                {c.cancelReason ? CANCEL_REASON_LABEL[c.cancelReason] : '—'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

async function LetzteAktivitaeten() {
  await devDelay(1800)
  const activities = await getLetzteAktivitaeten()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border border-b pb-4">
        <CardTitle>Letzte Aktivitäten</CardTitle>
      </CardHeader>
      <ul className="divide-border divide-y">
        {activities.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-6 py-3.5">
            <span className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold">
              {ACTIVITY_TYPE_LABEL[a.type].slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-mono font-medium">{a.contract.externalRef}</span>
                <span className="text-muted-foreground"> · {a.user.displayName}</span>
              </p>
              <p className="text-muted-foreground text-xs">{formatDate(a.createdAt)}</p>
            </div>
            {a.outcome ? (
              <Badge variant={a.outcome === 'WON' ? 'success' : 'outline'}>
                {ACTIVITY_OUTCOME_LABEL[a.outcome]}
              </Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  )
}
