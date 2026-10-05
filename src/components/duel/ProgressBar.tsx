import { SLOT_STYLE, type Slot } from '@/lib/duel/slots'
import { cn } from '@/lib/utils'

/** Tests passed so far, in the player's color. */
export function ProgressBar({ value, max, slot }: { value: number; max: number; slot: Slot }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Tests passed"
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className={cn('h-full rounded-full transition-all duration-500', SLOT_STYLE[slot].bar)} style={{ width: `${pct}%` }} />
    </div>
  )
}
