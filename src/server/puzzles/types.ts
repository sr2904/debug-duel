import type { TestCase } from '../../shared/duel-types'

/** A hand-written puzzle. Worker-only: hidden tests and the fix must never reach the browser bundle. */
export interface Puzzle {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  /** Name of the function the player edits and the tests call. */
  fnName: string
  /** What the function should do; shown to both players and spectators. */
  description: string
  buggyCode: string
  /** Known-good solution. Used by the seed-validation test and by the AI commentary. */
  referenceFix: string
  tests: TestCase[]
}
