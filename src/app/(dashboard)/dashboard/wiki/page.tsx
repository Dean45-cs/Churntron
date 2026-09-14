import { Suspense } from 'react'
import { devDelay } from '@/lib/dev'
import { getEinwaende, getWikiKennzahlen } from '@/lib/queries'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { WikiSucheSkeleton } from '@/components/skeletons/wiki-skeleton'
import { WikiSuche } from './wiki-suche'

/**
 * Die Einwand-Wiki.
 *
 * Der Kopf und die Kennzahlen kommen sofort, die Suche laedt darunter nach –
 * wie ueberall im Projekt liegt vor jeder datenabrufenden Einheit ein
 * <Suspense> mit einem formgleichen Skeleton.
 */
export default function WikiPage() {
  return (
    <>
      <PageHeader
        title="Einwand-Wiki"
        description="Was Kundinnen und Kunden sagen – und was darauf funktioniert. Suchen, während das Gespräch läuft; ergänzen, sobald es vorbei ist."
      />

      <Suspense fallback={<StatCardGridSkeleton count={3} />}>
        <WikiKennzahlen />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={<WikiSucheSkeleton />}>
          <WikiInhalt />
        </Suspense>
      </div>
    </>
  )
}

async function WikiKennzahlen() {
  await devDelay()
  const { gesamt, themenAnzahl, haeufigstesThema, bewaehrt } = await getWikiKennzahlen()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Einwandbehandlungen"
        value={String(gesamt)}
        hint={`aus ${themenAnzahl} Themen`}
      />
      <StatCard
        label="Häufigstes Thema"
        value={haeufigstesThema?.label ?? '—'}
        hint={haeufigstesThema ? `${haeufigstesThema.anzahl} Einträge` : undefined}
      />
      <StatCard
        label="Am häufigsten geholfen"
        value={bewaehrt ? `${bewaehrt.helpful}×` : '—'}
        hint={bewaehrt?.title ?? 'noch keine Rückmeldung'}
        accent
      />
    </div>
  )
}

async function WikiInhalt() {
  await devDelay(1200)
  // Archivierte Eintraege kommen mit: die Suche blendet sie aus, das Archiv
  // zeigt sie – sonst waere ein zurueckgelegter Eintrag nicht mehr zu erreichen.
  const eintraege = await getEinwaende(true)

  return <WikiSuche eintraege={eintraege} />
}
