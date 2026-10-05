import { SLOT_STYLE, type Slot } from '@/lib/duel/slots'
import type { Activity } from '@/lib/duel/types'
import { cn } from '@/lib/utils'
import { ProgressBar } from './ProgressBar'

interface PlayerStatusProps {
  slot: Slot
  /** True once the server has recorded a run that passed every test. */
  passedAll: boolean
  activity: Activity
  bestPassed: number
  total: number
}

/**
 * "Passed" and the score come from server-recorded submissions (trusted).
 * "Typing" and "Running tests" come from the presence room (display only).
 */
export function PlayerStatus({ slot, passedAll, activity, bestPassed, total }: PlayerStatusProps) {
  const style = SLOT_STYLE[slot]
  const label = passedAll ? 'All tests passing' : activity === 'testing' ? 'Running tests' : activity === 'typing' ? 'Typing' : 'Idle'
  const live = !passedAll && activity !== 'idle'

  return (
    <div className="space-y-2" data-testid="player-status">
      <div className="flex items-center justify-between gap-2 font-mono text-xs">
        <span className={cn('inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider', passedAll ? 'text-primary' : live ? style.text : 'text-muted-foreground')}>
          <span className={cn('size-2 rounded-full', passedAll ? 'bg-primary' : live ? cn(style.bar, 'animate-pulse') : 'bg-muted-foreground/50')} />
          {label}
        </span>
        <span className="text-muted-foreground" data-testid="player-score">
          {bestPassed} of {total} passing
        </span>
      </div>
      <ProgressBar value={bestPassed} max={total} slot={slot} />
    </div>
  )
}
