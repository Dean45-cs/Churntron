import { PageHeaderSkeleton } from '@/components/skeletons/page-header-skeleton'
import { ChallengeGridSkeleton } from '@/components/skeletons/challenge-card-skeleton'
import { LeaderboardSkeleton } from '@/components/skeletons/leaderboard-skeleton'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction />
      <ChallengeGridSkeleton />
      <div className="mt-6">
        <LeaderboardSkeleton />
      </div>
    </>
  )
}
