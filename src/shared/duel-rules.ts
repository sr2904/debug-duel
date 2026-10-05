/**
 * Pure game rules, kept free of I/O so they are easy to read and unit test.
 */

import type { SubmissionData } from './duel-types'

/** How long after the deadline a test run is still accepted (network + test run time). */
export const SUBMIT_GRACE_MS = 3000

/** Round length limits, in seconds. The host picks within these when creating a duel. */
export const MIN_DURATION_SEC = 60
export const MAX_DURATION_SEC = 900
export const DEFAULT_DURATION_SEC = 300

export function clampDuration(sec: unknown): number {
  const n = typeof sec === 'number' && Number.isFinite(sec) ? sec : DEFAULT_DURATION_SEC
  return Math.min(MAX_DURATION_SEC, Math.max(MIN_DURATION_SEC, Math.round(n)))
}

type Scored = Pick<SubmissionData, 'userId' | 'passed' | 'at'>

/** Best run per player: most tests passed; if tied, the one the server received first. */
export function bestRuns(submissions: Scored[]): Map<string, Scored> {
  const best = new Map<string, Scored>()
  for (const s of submissions) {
    const current = best.get(s.userId)
    if (!current || s.passed > current.passed || (s.passed === current.passed && s.at < current.at)) {
      best.set(s.userId, s)
    }
  }
  return best
}

/**
 * Decide a round that ended by timeout or by the host (nobody passed everything).
 * The player with more passing tests wins; equal counts go to whoever reached
 * that count first (server timestamps). Nobody passing anything is a draw.
 * Returns '' for a draw.
 */
export function winnerByScore(submissions: Scored[], playerIds: string[]): string {
  const best = bestRuns(submissions.filter((s) => playerIds.includes(s.userId)))
  const ranked = [...best.values()]
    .filter((s) => s.passed > 0)
    .sort((a, b) => b.passed - a.passed || a.at - b.at)
  return ranked[0]?.userId ?? ''
}
