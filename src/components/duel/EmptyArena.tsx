import { Swords } from 'lucide-react'
import { Button } from '@/components/ui'

/** Friendly empty state for the lobby list when nobody has created a duel yet. */
export function EmptyArena({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center" data-testid="no-duels">
      <Swords className="size-8 text-primary" aria-hidden />
      <p className="font-mono text-lg font-bold">The arena is empty.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        No duels yet. Start the first one, then send the link to a friend and race to fix the bug.
      </p>
      <Button variant="outline" onClick={onStart}>
        Name your first duel
      </Button>
    </div>
  )
}
