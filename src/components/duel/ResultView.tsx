import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import type { RecordData } from 'deepspace'
import { Badge } from '@/components/ui'
import { bestRuns } from '../../shared/duel-rules'
import type { DuelData, SubmissionData } from '../../shared/duel-types'

/** If commentary has been "running" this long after the round ended, treat it as failed. */
const COMMENTARY_STALE_MS = 60_000

interface ResultViewProps {
  duel: DuelData
  submissions: RecordData<SubmissionData>[]
  nameOf: (userId: string) => string
  now: () => number
}

const REASONS = {
  solved: 'passed every hidden test first',
  timeout: 'had the best score when time ran out',
  host_ended: 'had the best score when the host ended the round',
} as const

/** Shown to everyone at the moment the server marks the duel finished. */
export function ResultView({ duel, submissions, nameOf, now }: ResultViewProps) {
  const best = bestRuns(submissions.map((s) => s.data))
  const players = [duel.p1Id, duel.p2Id].filter((id): id is string => !!id)
  const reason = duel.endReason ? REASONS[duel.endReason] : ''

  const commentaryStale =
    duel.commentaryStatus === 'running' && duel.finishedAt !== undefined && now() - duel.finishedAt > COMMENTARY_STALE_MS
  const commentaryPending = duel.commentaryStatus === 'pending' || (duel.commentaryStatus === 'running' && !commentaryStale)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6" data-testid="winner-screen">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Trophy className="mx-auto size-10 text-warning" />
        {duel.winnerId ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold" data-testid="winner-name">{nameOf(duel.winnerId)} wins</h1>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="win-reason">They {reason}.</p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-semibold" data-testid="winner-name">Draw</h1>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="win-reason">Nobody passed a test before the round ended.</p>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((id) => (
          <div key={id} className="rounded-lg border border-border bg-card p-4" data-testid="result-row">
            <div className="flex items-center justify-between">
              <span className="font-medium">{nameOf(id)}</span>
              {id === duel.winnerId && <Badge variant="success">Winner</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Best run: {best.get(id)?.passed ?? 0} of {duel.testCount ?? 0} tests
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4" data-testid="commentary">
        <h2 className="mb-2 text-sm font-semibold">Commentary</h2>
        {duel.commentaryStatus === 'done' && duel.commentary ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed" data-testid="commentary-text">{duel.commentary}</p>
        ) : commentaryPending ? (
          <p className="text-sm text-muted-foreground" data-testid="commentary-pending">Writing commentary…</p>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="commentary-unavailable">
            Commentary is not available for this duel.
          </p>
        )}
      </div>

      <Link to="/home" className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Back to all duels
      </Link>
    </div>
  )
}
