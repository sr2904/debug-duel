import { useEffect, useState } from 'react'
import { formatClock } from '@/lib/duel/format'
import { cn } from '@/lib/utils'

/** Shared countdown to a server-written deadline. `now` is the server-corrected clock. */
export function Countdown({ endsAt, now }: { endsAt: number; now: () => number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(timer)
  }, [])

  const remaining = endsAt - now()
  return (
    <div
      data-testid="countdown"
      className={cn(
        'font-mono text-3xl font-bold tabular-nums',
        remaining <= 30_000 ? 'text-destructive' : 'text-foreground',
      )}
    >
      {formatClock(remaining)}
    </div>
  )
}
