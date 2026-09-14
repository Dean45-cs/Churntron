import { Suspense } from 'react'
import { Swords, Trophy } from 'lucide-react'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getDuellRangliste, getKollegen, getMeineDuelle } from '@/lib/queries'
import { formatZahl } from '@/lib/utils'
import { Avatar } from '@/components/avatar'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DuelRanglisteSkeleton,
  MeineDuelleSkeleton,
} from '@/components/skeletons/duel-card-skeleton'
import { DuellKarte } from './duell-karte'
import { DuellStarten } from './duell-starten'

/**
 * Duelle: 1 gegen 1 und 2 gegen 2 gegen die Kolleginnen und Kollegen.
 *
 * Der Seitenkopf steht sofort, jede datenabrufende Einheit haengt in einer
 * eigenen Suspense-Grenze. Die eigenen Duelle und die Rangliste des Teams sind
 * getrennte Abfragen – die Rangliste soll die eigene Liste nicht aufhalten.
 */
export default async function DuelsPage() {
  const { id: userId } = await nutzerOderAnmeldung()

  return (
    <>
      <PageHeader
        title="Duelle"
        description="Tritt gegen deine Kolleginnen und Kollegen an – 1 gegen 1 oder 2 gegen 2. Gewertet wird, was ohnehin erfasst wird."
      />

      <Suspense fallback={<MeineDuelleSkeleton />}>
        <MeineDuelle userId={userId} />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={<DuelRanglisteSkeleton />}>
          <Rangliste />
        </Suspense>
      </div>
    </>
  )
}

async function MeineDuelle({ userId }: { userId: string }) {
  await devDelay()
  const [{ einladungen, laufend, beendet, bilanz }, kollegen] = await Promise.all([
    getMeineDuelle(userId),
    getKollegen(userId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Laufende Duelle"
          value={formatZahl(laufend.length)}
          hint={einladungen.length > 0 ? `${einladungen.length} Einladung offen` : 'nichts offen'}
          accent={laufend.length > 0}
        />
        <StatCard
          label="Bilanz (30 Tage)"
          value={`${bilanz.siege} : ${bilanz.niederlagen}`}
          hint={`${bilanz.unentschieden} unentschieden`}
        />
        <StatCard
          label="Gespielt"
          value={formatZahl(bilanz.siege + bilanz.niederlagen + bilanz.unentschieden)}
          hint="beendete Duelle im Zeitraum"
        />
      </div>

      <DuellStarten kollegen={kollegen} />

      {einladungen.length > 0 ? <Abschnitt titel="Einladungen" duelle={einladungen} /> : null}

      <Abschnitt
        titel="Laufende Duelle"
        duelle={laufend}
        leer="Gerade läuft kein Duell. Oben ist die Taste dafür."
      />

      {beendet.length > 0 ? <Abschnitt titel="Beendet" duelle={beendet} /> : null}
    </div>
  )
}

function Abschnitt({
  titel,
  duelle,
  leer,
}: {
  titel: string
  duelle: Awaited<ReturnType<typeof getMeineDuelle>>['laufend']
  leer?: string
}) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <Swords className="size-3.5" />
        {titel}
        <span className="tabular font-mono">{duelle.length}</span>
      </h2>

      {duelle.length === 0 ? (
        <Card className="text-muted-foreground p-6 text-sm">{leer}</Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {duelle.map((d) => (
            <DuellKarte key={d.id} duell={d} />
          ))}
        </div>
      )}
    </section>
  )
}

async function Rangliste() {
  await devDelay(1700)
  const zeilen = await getDuellRangliste(30)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border flex-row items-center justify-between border-b pb-4">
        <CardTitle>Duell-Rangliste</CardTitle>
        <span className="border-border text-muted-foreground rounded-lg border px-3 py-1.5 text-xs">
          Letzte 30 Tage
        </span>
      </CardHeader>

      {zeilen.length === 0 ? (
        <p className="text-muted-foreground px-6 py-10 text-center text-sm">
          Noch kein Duell beendet. Wer fängt an?
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {zeilen.map((z, i) => (
            <li key={z.userId} className="flex items-center gap-4 px-6 py-3.5">
              <span
                className={
                  i === 0
                    ? 'bg-accent text-accent-foreground grid size-6 place-items-center rounded-md text-xs font-bold'
                    : 'bg-secondary text-secondary-foreground grid size-6 place-items-center rounded-md text-xs font-semibold'
                }
              >
                {i + 1}
              </span>
              <Avatar userId={z.userId} displayName={z.name} version={z.avatarVersion} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{z.name}</p>
                <p className="text-muted-foreground text-xs">
                  {z.team ?? '—'} · {z.duelle} Duelle · {z.quote} % gewonnen
                </p>
              </div>
              <span className="tabular flex items-center gap-1.5 font-mono text-sm font-semibold">
                {i === 0 ? <Trophy className="text-accent size-4" /> : null}
                {z.siege} : {z.niederlagen}
                {z.unentschieden > 0 ? ` : ${z.unentschieden}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
