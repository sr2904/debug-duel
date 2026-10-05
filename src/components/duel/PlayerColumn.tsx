import type { ReactNode } from 'react'
import { SLOT_STYLE, type Slot } from '@/lib/duel/slots'
import type { Activity } from '@/lib/duel/types'
import { cn } from '@/lib/utils'
import { PlayerStatus } from './PlayerStatus'

interface PlayerColumnProps {
  testId: string
  slot: Slot
  name: string
  isYou: boolean
  passedAll: boolean
  activity: Activity
  bestPassed: number
  total: number
  /** Extra classes, used to reorder columns on small screens. */
  className?: string
  children: ReactNode
}

/** One side of the arena: the player's name, live status, score bar, and their editor. */
export function PlayerColumn({ testId, slot, name, isYou, passedAll, activity, bestPassed, total, className, children }: PlayerColumnProps) {
  const style = SLOT_STYLE[slot]
  return (
    <section className={cn('relative flex min-w-0 flex-col gap-3 rounded-lg border-2 bg-card p-3 sm:p-4', style.border, style.glow, className)} data-testid={testId}>
      {/* A soft pulse in the player's color while their tests run. */}
      {activity === 'testing' && <div aria-hidden className={cn('pointer-events-none absolute inset-0 animate-pulse rounded-lg ring-2', style.ring)} />}
      <header className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className={cn('truncate font-mono text-xl font-black uppercase tracking-tight sm:text-2xl', style.text)} data-testid="player-name">
            {name}
          </h2>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {style.label}
            {isYou ? ' · you' : ''}
          </span>
        </div>
        <PlayerStatus slot={slot} passedAll={passedAll} activity={activity} bestPassed={bestPassed} total={total} />
      </header>
      {children}
    </section>
  )
}
