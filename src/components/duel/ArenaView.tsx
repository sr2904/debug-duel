import type { RecordData } from 'deepspace'
import { Button } from '@/components/ui'
import { bestRuns } from '../../shared/duel-rules'
import type { DuelData, EntryData, SubmissionData } from '../../shared/duel-types'
import type { Activity } from '@/lib/duel/types'
import { callAction } from '@/lib/duel/api'
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

/** The running round: puzzle text, countdown, and both editors. */
export function ArenaView(props: ArenaViewProps) {
  const { duelId, duel, entries, submissions, userId, isHost, nameOf, activityOf, setMyActivity, now } = props
  const best = bestRuns(submissions.map((s) => s.data))
  // Show the signed-in player's own editor first; spectators see player 1 then player 2.
  const playerIds = [duel.p1Id, duel.p2Id]
    .filter((id): id is string => !!id)
    .sort((a, b) => Number(b === userId) - Number(a === userId))

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
        <div className="max-w-2xl">
          <h1 className="text-lg font-semibold" data-testid="puzzle-title">{duel.puzzleTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="puzzle-description">{duel.puzzleDescription}</p>
        </div>
        <div className="flex items-center gap-4">
          {duel.endsAt && <Countdown endsAt={duel.endsAt} now={now} />}
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              data-testid="end-round-btn"
              onClick={() => void callAction('finishRound', { duelId })}
            >
              End round
            </Button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        {playerIds.map((playerId) => {
          const entry = entries.find((e) => e.data.userId === playerId)
          const isMe = playerId === userId
          const run = best.get(playerId)
          return (
            <PlayerColumn
              key={playerId}
              testId={isMe ? 'my-column' : 'player-column'}
              name={nameOf(playerId)}
              isYou={isMe}
              passedAll={run?.passed === duel.testCount}
              activity={activityOf(playerId)}
              bestPassed={run?.passed}
              total={duel.testCount}
            >
              {isMe && entry ? (
                <MyPanel duelId={duelId} entryId={entry.recordId} savedCode={entry.data.code} setActivity={setMyActivity} />
              ) : (
                // Opponent and spectator view: read-only, follows the owner's saved edits live.
                <CodeBox value={entry?.data.code ?? ''} readOnly testId="watch-editor" />
              )}
            </PlayerColumn>
          )
        })}
      </div>
    </div>
  )
}
