import type { DuelData } from '../../shared/duel-types'

export type Slot = 1 | 2

/**
 * Each player has a fixed color for the whole room: player 1 cyan, player 2 magenta.
 * The class names are written out in full (not built from strings) so Tailwind can see them.
 */
export const SLOT_STYLE = {
  1: {
    label: 'Player 1',
    text: 'text-p1',
    border: 'border-p1/60',
    borderSolid: 'border-p1',
    ring: 'ring-p1',
    bar: 'bg-p1',
    soft: 'bg-p1/10',
    glow: 'shadow-[0_0_36px_-12px_var(--color-p1)]',
    focus: 'focus-visible:border-p1 focus-visible:ring-p1/40',
  },
  2: {
    label: 'Player 2',
    text: 'text-p2',
    border: 'border-p2/60',
    borderSolid: 'border-p2',
    ring: 'ring-p2',
    bar: 'bg-p2',
    soft: 'bg-p2/10',
    glow: 'shadow-[0_0_36px_-12px_var(--color-p2)]',
    focus: 'focus-visible:border-p2 focus-visible:ring-p2/40',
  },
} as const

/** Which slot a user holds in this duel, if any. */
export function slotOf(duel: Pick<DuelData, 'p1Id' | 'p2Id'>, userId: string | undefined | null): Slot | null {
  if (!userId) return null
  if (duel.p1Id === userId) return 1
  if (duel.p2Id === userId) return 2
  return null
}
