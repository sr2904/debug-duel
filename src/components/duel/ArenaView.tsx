import type { RecordData } from 'deepspace'
import { Button } from '@/components/ui'
import { bestRuns } from '../../shared/duel-rules'
import type { DuelData, EntryData, SubmissionData } from '../../shared/duel-types'
import { callAction } from '@/lib/duel/api'
import type { Slot } from '@/lib/duel/slots'
import type { Activity } from '@/lib/duel/types'
import { Countdown } from './Countdown'
import { CodeBox } from './CodeBox'
import { MyPanel } from './MyPanel'
import { PlayerColumn } from './PlayerColumn'

interface ArenaViewProps {
  duelId: string
  duel: DuelData
  entries: RecordData<EntryData>[]
  submissions: RecordData<SubmissionData>[]
  userId: string
  isHost: boolean
  nameOf: (userId: string) => string
  activityOf: (userId: string) => Activity
  setMyActivity: (a: Activity) => void
  now: () => number
}

/**
 * The running round. Desktop: puzzle on top, then player 1 | timer + VS | player 2.
 * Phones: the timer first, your own editor next (spectators see player 1 then 2), stacked.
 */
export function ArenaView(props: ArenaViewProps) {
  const { duelId, duel, entries, submissions, userId, isHost, nameOf, activityOf, setMyActivity, now } = props
  const best = bestRuns(submissions.map((s) => s.data))
  const total = duel.testCount ?? 0
  const iAmPlayer2 = duel.p2Id === userId
  // Small-screen order only; on large screens the DOM order (p1, center, p2) applies.
  const mobileOrder: Record<Slot, string> = iAmPlayer2 ? { 1: 'max-lg:order-3', 2: 'max-lg:order-2' } : { 1: 'max-lg:order-2', 2: 'max-lg:order-3' }

  const column = (slot: Slot, playerId: string | undefined) => {
    if (!playerId) return null
    const entry = entries.find((e) => e.data.userId === playerId)
    const isMe = playerId === userId
    const run = best.get(playerId)
    return (
      <PlayerColumn
        key={slot}
        testId={isMe ? 'my-column' : 'player-column'}
        slot={slot}
        name={nameOf(playerId)}
        isYou={isMe}
        passedAll={total > 0 && run?.passed === total}
        activity={activityOf(playerId)}
        bestPassed={run?.passed ?? 0}
        total={total}
        className={mobileOrder[slot]}
      >
        {isMe && entry ? (
          <MyPanel duelId={duelId} entryId={entry.recordId} slot={slot} savedCode={entry.data.code} setActivity={setMyActivity} />
        ) : (
          // Opponent and spectator view: read-only, follows the owner's saved edits live.
          <CodeBox value={entry?.data.code ?? ''} readOnly testId="watch-editor" slot={slot} />
        )}
      </PlayerColumn>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">The puzzle</p>
        <h1 className="mt-1 font-mono text-xl font-bold sm:text-2xl" data-testid="puzzle-title">{duel.puzzleTitle}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base" data-testid="puzzle-description">{duel.puzzleDescription}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {column(1, duel.p1Id)}

        <div className="flex flex-col items-center gap-2 py-2 max-lg:order-1 lg:w-44 lg:pt-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Time left</span>
          {duel.endsAt && <Countdown endsAt={duel.endsAt} now={now} />}
          <span className="font-mono text-3xl font-black tracking-tighter" aria-hidden>
            <span className="text-p1">V</span>
            <span className="text-p2">S</span>
          </span>
          {isHost && (
            <Button variant="outline" size="sm" data-testid="end-round-btn" onClick={() => void callAction('finishRound', { duelId })}>
              End round
            </Button>
          )}
        </div>

        {column(2, duel.p2Id)}
      </div>
    </div>
  )
}
