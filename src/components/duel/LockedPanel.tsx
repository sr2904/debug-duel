import { Lock } from 'lucide-react'
import { SLOT_STYLE, type Slot } from '@/lib/duel/slots'
import { cn } from '@/lib/utils'

// Fake "code" bars, the same for everyone. They are decoration only: the real code is never sent to this browser.
const BARS = [62, 40, 78, 55, 30, 70, 48, 66, 36, 58, 44, 72, 28, 52]

/** Shown in place of the opponent's editor while a round is running. */
export function LockedPanel({ slot }: { slot: Slot }) {
  return (
    <div
      data-testid="locked-panel"
      className="relative h-72 w-full overflow-hidden rounded-md border border-border bg-background sm:h-80 lg:h-[26rem]"
    >
      <div aria-hidden className="space-y-3 p-4 opacity-50 blur-[3px]">
        {BARS.map((w, i) => (
          <div key={i} className={cn('h-2.5 rounded-full', SLOT_STYLE[slot].bar)} style={{ width: `${w}%`, marginLeft: `${(i % 3) * 6}%`, opacity: 0.35 }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 px-6 text-center">
        <Lock className={cn('size-8', SLOT_STYLE[slot].text)} />
        <p className="font-mono text-sm font-bold uppercase tracking-wider">Code hidden until the round ends</p>
        <p className="max-w-xs text-xs text-muted-foreground">No peeking. You can still see their live status and score.</p>
      </div>
    </div>
  )
}
