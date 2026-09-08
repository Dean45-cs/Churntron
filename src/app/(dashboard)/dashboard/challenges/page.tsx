import { Suspense } from 'react'
import { Plus, Trophy } from 'lucide-react'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { formatDate, initials } from '@/lib/utils'
import { CHALLENGE_METRIC_LABEL } from '@/lib/labels'
import { getChallengesMitFortschritt, getLeaderboard } from '@/lib/queries'
import { PageHeader } from '@/components/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChallengeGridSkeleton } from '@/components/skeletons/challenge-card-skeleton'
import { LeaderboardSkeleton } from '@/components/skeletons/leaderboard-skeleton'

export default async function ChallengesPage() {
  const nutzer = await nutzerOderAnmeldung()
  const isAdmin = nutzer.role === 'ADMIN'

  return (
    <>
      <PageHeader
        title="Challenges"
        description="Laufende Wettbewerbe und das Leaderboard. Punktevergabe und Anlege-Formular kommen in Stage 5."
        action={
          isAdmin ? (
            // Orange bleibt fuer genau solche CTAs reserviert.
            <Button variant="accent" disabled title="Kommt in Stage 5">
              <Plus />
              Neue Challenge
            </Button>
          ) : null
        }
      />

      <Suspense fallback={<ChallengeGridSkeleton />}>
        <ChallengeKarten />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <Leaderboard />
        </Suspense>
      </div>
    </>
  )
}

async function ChallengeKarten() {
  await devDelay()
  const challenges = await getChallengesMitFortschritt()

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {challenges.map((c) => (
        <Card key={c.id} className="flex h-[210px] flex-col justify-between p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="leading-tight font-semibold">{c.title}</h3>
              <Badge variant={c.laeuft ? 'success' : 'outline'}>
                {c.laeuft ? 'läuft' : 'beendet'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{c.description}</p>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{CHALLENGE_METRIC_LABEL[c.metric]}</span>
              <span className="tabular font-semibold">
                {c._count.pointsEvents} / {c.target}
              </span>
            </div>
            <Progress
              value={c.fortschritt}
              indicatorClassName={c.fortschritt >= 100 ? 'bg-success' : undefined}
            />
            <p className="text-muted-foreground mt-3 text-xs">
              noch {c.restTage} Tage · endet {formatDate(c.endsAt)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}

async function Leaderboard() {
  await devDelay(1700)
  const rows = await getLeaderboard(30)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border flex-row items-center justify-between border-b pb-4">
        <CardTitle>Leaderboard</CardTitle>
        {/* Der Zeitraumfilter wird in Stage 5 funktional – die Punkte liegen als
            Einzelereignisse vor, deshalb ist jeder Zeitraum abfragbar. */}
        <span className="border-border text-muted-foreground rounded-lg border px-3 py-1.5 text-xs">
          Letzte 30 Tage
        </span>
      </CardHeader>

      <ul className="divide-border divide-y">
        {rows.map((r, i) => (
          <li key={r.userId} className="flex items-center gap-4 px-6 py-3.5">
            <span
              className={
                i === 0
                  ? 'bg-accent text-accent-foreground grid size-6 place-items-center rounded-md text-xs font-bold'
                  : 'bg-secondary text-secondary-foreground grid size-6 place-items-center rounded-md text-xs font-semibold'
              }
            >
              {i + 1}
            </span>
            <span className="bg-secondary text-secondary-foreground grid size-9 place-items-center rounded-full text-xs font-semibold">
              {initials(r.user?.displayName ?? '')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.user?.displayName}</p>
              <p className="text-muted-foreground text-xs">{r.user?.team?.name ?? '—'}</p>
            </div>
            <span className="tabular flex items-center gap-1.5 text-sm font-semibold">
              {i === 0 ? <Trophy className="text-accent size-4" /> : null}
              {r.punkte}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
