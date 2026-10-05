import { Badge } from '@/components/ui'
import type { Activity } from '@/lib/duel/types'
import type { ReactNode } from 'react'
import { PlayerStatus } from './PlayerStatus'

interface PlayerColumnProps {
  testId: string
  name: string
  isYou: boolean
  passedAll: boolean
  activity: Activity
  bestPassed?: number
  total?: number
  children: ReactNode
}

/** One side of the arena: the player's name, status, and their editor. */
export function PlayerColumn({ testId, name, isYou, passedAll, activity, bestPassed, total, children }: PlayerColumnProps) {
  return (
    <section className="flex min-h-0 flex-col gap-2" data-testid={testId}>
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold" data-testid="player-name">{name}</h2>
          {isYou && <Badge variant="outline">You</Badge>}
        </div>
        <PlayerStatus passedAll={passedAll} activity={activity} bestPassed={bestPassed} total={total} />
      </header>
      {children}
    </section>
  )
}
