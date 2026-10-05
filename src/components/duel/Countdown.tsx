import { useEffect, useState } from 'react'
import { formatClock } from '@/lib/duel/format'
import { cn } from '@/lib/utils'

const URGENT_MS = 15_000

/** Shared countdown to a server-written deadline. `now` is the server-corrected clock. */
export function Countdown({ endsAt, now }: { endsAt: number; now: () => number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(timer)
  }, [])

  const remaining = endsAt - now()
  const urgent = remaining <= URGENT_MS
  return (
    <div
      data-testid="countdown"
      data-urgent={urgent}
      style={urgent ? { textShadow: '0 0 28px currentColor' } : undefined}
      className={cn(
        'font-mono text-5xl font-black tabular-nums tracking-tight sm:text-6xl',
        urgent ? 'urgent-pulse text-destructive' : 'text-foreground',
      )}
    >
      {formatClock(remaining)}
    </div>
  )
}
