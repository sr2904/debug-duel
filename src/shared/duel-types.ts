/**
 * Types shared by the worker (actions, schemas) and the browser (pages, hooks).
 * Types only: nothing here may import worker-only code or hold hidden tests.
 */

export type DuelStatus = 'lobby' | 'running' | 'finished'
export type EndReason = 'solved' | 'timeout' | 'host_ended'
export type CommentaryStatus = 'none' | 'pending' | 'running' | 'done' | 'failed'

/** One row of the `duels` collection. Only server actions change it after creation. */
export type DuelData = {
  title: string
  hostId: string
  status: DuelStatus
  p1Id?: string
  p2Id?: string
  durationSec: number
  // Filled in by startRound (the buggy code and description are public to the room;
  // the hidden tests and the reference fix never are).
  puzzleId?: string
  puzzleTitle?: string
  puzzleDescription?: string
  buggyCode?: string
  testCount?: number
  // Server clock, epoch milliseconds. Clients never set these.
  startedAt?: number
  endsAt?: number
  finishedAt?: number
  winnerId?: string
  endReason?: EndReason
  commentaryStatus: CommentaryStatus
  commentary?: string
}

/** One row of `entries`: a player's live editor contents. Only that player can edit it. */
export type EntryData = {
  duelId: string
  userId: string
  code: string
}

/** One row of `submissions`: a test run the server accepted. Written only by actions. */
export type SubmissionData = {
  duelId: string
  userId: string
  passed: number
  total: number
  code: string
  at: number
}

/** A hidden test: call the puzzle's function with `args`, expect `expected` (JSON-comparable). */
export type TestCase = {
  name: string
  args: unknown[]
  expected: unknown
}

export type TestOutcome = {
  name: string
  passed: boolean
  error?: string
}

/** Every action answers with this shape (matches deepspace's ActionResult). */
export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
