import { Badge } from '@/components/ui'
import type { Activity } from '@/lib/duel/types'

interface PlayerStatusProps {
  /** True once the server has recorded a run that passed every test. */
  passedAll: boolean
  activity: Activity
  bestPassed?: number
  total?: number
}

/**
 * "passed" and the score come from server-recorded submissions (trusted).
 * "typing" and "running tests" come from the presence room (display only).
 */
export function PlayerStatus({ passedAll, activity, bestPassed, total }: PlayerStatusProps) {
  return (
    <div className="flex items-center gap-2" data-testid="player-status">
      {total ? (
        <span className="text-xs text-muted-foreground" data-testid="player-score">
          Best {bestPassed ?? 0}/{total}
        </span>
      ) : null}
      {passedAll ? (
        <Badge variant="success">Passed all tests</Badge>
      ) : activity === 'testing' ? (
        <Badge variant="info">Running tests</Badge>
      ) : activity === 'typing' ? (
        <Badge variant="warning">Typing</Badge>
      ) : (
        <Badge variant="secondary">Idle</Badge>
      )}
    </div>
  )
}
