import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import type { RecordData } from 'deepspace'
import { Badge } from '@/components/ui'
import { formatClock } from '@/lib/duel/format'
import { SLOT_STYLE, slotOf, type Slot } from '@/lib/duel/slots'
import { cn } from '@/lib/utils'
import { bestRuns } from '../../shared/duel-rules'
import type { DuelData, SubmissionData } from '../../shared/duel-types'
import { ProgressBar } from './ProgressBar'

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
  const total = duel.testCount ?? 0
  const reason = duel.endReason ? REASONS[duel.endReason] : ''
  const winnerSlot = duel.winnerId ? slotOf(duel, duel.winnerId) : null
  const took = duel.startedAt !== undefined && duel.finishedAt !== undefined ? formatClock(duel.finishedAt - duel.startedAt) : null

  const commentaryStale =
    duel.commentaryStatus === 'running' && duel.finishedAt !== undefined && now() - duel.finishedAt > COMMENTARY_STALE_MS
  const commentaryPending = duel.commentaryStatus === 'pending' || (duel.commentaryStatus === 'running' && !commentaryStale)

  const playerCard = (slot: Slot, id: string | undefined) => {
    if (!id) return null
    const style = SLOT_STYLE[slot]
    const passed = best.get(id)?.passed ?? 0
    const runs = submissions.filter((s) => s.data.userId === id).length
    const won = id === duel.winnerId
    return (
      <div key={id} className={cn('space-y-3 rounded-lg border-2 bg-card p-4', won ? cn(style.borderSolid, style.glow) : 'border-border')} data-testid="result-row">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate font-mono text-lg font-black uppercase', style.text)}>{nameOf(id)}</span>
          {won && <Badge variant="success" className="font-mono uppercase">Winner</Badge>}
        </div>
        <ProgressBar value={passed} max={total} slot={slot} />
        <p className="font-mono text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{passed} of {total}</span> tests · {runs} {runs === 1 ? 'run' : 'runs'}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-testid="winner-screen">
      <div className="arena-pop rounded-lg border-2 border-border bg-card px-6 py-10 text-center">
        <Trophy className={cn('mx-auto size-12', winnerSlot ? SLOT_STYLE[winnerSlot].text : 'text-muted-foreground')} />
        {duel.winnerId ? (
          <>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">Winner</p>
            <h1
              className={cn('mt-1 break-words font-mono text-5xl font-black uppercase tracking-tight sm:text-7xl', winnerSlot ? SLOT_STYLE[winnerSlot].text : '')}
              style={{ textShadow: '0 0 40px currentColor' }}
              data-testid="winner-name"
            >
              {nameOf(duel.winnerId)}
            </h1>
            <p className="mt-3 text-muted-foreground" data-testid="win-reason">They {reason}.</p>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-mono text-5xl font-black uppercase tracking-tight sm:text-7xl" data-testid="winner-name">Draw</h1>
            <p className="mt-3 text-muted-foreground" data-testid="win-reason">Nobody passed a test before the round ended.</p>
          </>
        )}
        {took && (
          <p className="mt-5 font-mono text-sm uppercase tracking-widest text-muted-foreground">
            Round time <span className="font-bold text-foreground" data-testid="time-taken">{took}</span>
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {playerCard(1, duel.p1Id)}
        {playerCard(2, duel.p2Id)}
      </div>

      <div className="rounded-lg border border-border bg-card p-5" data-testid="commentary">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Commentary</h2>
        {duel.commentaryStatus === 'done' && duel.commentary ? (
          <p className="whitespace-pre-wrap leading-relaxed" data-testid="commentary-text">{duel.commentary}</p>
        ) : commentaryPending ? (
          <p className="animate-pulse text-sm text-muted-foreground" data-testid="commentary-pending">Writing commentary…</p>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="commentary-unavailable">Commentary is not available for this duel.</p>
        )}
      </div>

      <Link to="/home" className="text-center font-mono text-sm uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        ← All duels
      </Link>
    </div>
  )
}
