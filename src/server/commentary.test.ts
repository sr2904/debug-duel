/**
 * Regression tests for "the commentary contradicts the result".
 * The reported case: Host fixed /[^a-z]/ to /[^a-z0-9]/ and passed 7/7; Alice
 * stayed at 6/7. The commentary claimed identical code, a 6/7 tie, and a tiebreak win.
 */

import { describe, expect, it } from 'vitest'
import type { DuelData, SubmissionData } from '../shared/duel-types'
import { buildCommentaryInput } from './commentary-input'
import { SYSTEM_PROMPT, buildPrompt, findContradiction } from './commentary-prompt'
import { seedPuzzles } from './puzzles/seed-puzzles'

const puzzle = seedPuzzles.find((p) => p.id === 'is-palindrome')!
const ORIGINAL = puzzle.buggyCode // uses /[^a-z]/g
const FIXED = puzzle.referenceFix // uses /[^a-z0-9]/g
const TOTAL = puzzle.tests.length // 7

const duel: DuelData = {
  title: 'd', hostId: 'host-id', status: 'finished', p1Id: 'host-id', p2Id: 'alice-id', durationSec: 300,
  testCount: TOTAL, winnerId: 'host-id', endReason: 'solved', puzzleId: puzzle.id, commentaryStatus: 'pending',
}
const names = { 'host-id': 'Host', 'alice-id': 'Alice' }
const run = (userId: string, passed: number, code: string, at: number): SubmissionData =>
  ({ duelId: 'x', userId, passed, total: TOTAL, code, at })

// Host: first an unfixed 6/7 run, then the winning 7/7 run. Alice: two runs, both 6/7 with the original code.
const chronological = [
  run('host-id', 6, ORIGINAL, 1_000),
  run('alice-id', 6, ORIGINAL, 2_000),
  run('alice-id', 6, ORIGINAL + '\n// still stuck', 3_000),
  run('host-id', TOTAL, FIXED, 4_000),
]

describe('commentary input comes from each player\'s own recorded runs', () => {
  // The database returns newest-first by default; the old code took the LAST row of that list,
  // i.e. the oldest run. The input must be identical whichever way the rows arrive.
  for (const [label, submissions] of [
    ['oldest first', chronological],
    ['newest first (the database default)', [...chronological].reverse()],
    ['shuffled', [chronological[2], chronological[0], chronological[3], chronological[1]]],
  ] as const) {
    it(`is correct when rows arrive ${label}`, () => {
      const input = buildCommentaryInput({ duel, puzzle, submissions: [...submissions], names })!
      const [host, alice] = input.players

      expect(host).toMatchObject({ name: 'Host', bestPassed: TOTAL, total: TOTAL, runs: 2, unchanged: false })
      expect(host.code).toBe(FIXED)
      expect(host.code).toContain('a-z0-9')

      expect(alice).toMatchObject({ name: 'Alice', bestPassed: 6, total: TOTAL, runs: 2, unchanged: true })
      expect(alice.code).toBe(ORIGINAL)

      expect(input.winnerName).toBe('Host')
      expect(input.scoresTied).toBe(false)
      expect(input.sameCode).toBe(false)
      expect(input.result).toBe(`Host won by passing all ${TOTAL} tests first.`)
    })
  }

  it('returns nothing to comment on when neither player ran their tests', () => {
    expect(buildCommentaryInput({ duel, puzzle, submissions: [], names })).toBeNull()
  })

  it('handles a player who never ran their tests without inventing a score', () => {
    const input = buildCommentaryInput({ duel, puzzle, submissions: [run('host-id', TOTAL, FIXED, 1)], names })!
    expect(input.players[1]).toMatchObject({ name: 'Alice', bestPassed: 0, runs: 0 })
    expect(input.players[1].code).toContain('never ran')
  })

  it('reports a timeout win and a draw in the right words', () => {
    const timeout = buildCommentaryInput({ duel: { ...duel, endReason: 'timeout' }, puzzle, submissions: chronological, names })!
    expect(timeout.result).toContain('time ran out')
    const draw = buildCommentaryInput({ duel: { ...duel, winnerId: '', endReason: 'timeout' }, puzzle, submissions: [run('host-id', 0, ORIGINAL, 1)], names })!
    expect(draw.winnerName).toBeNull()
    expect(draw.result).toContain('draw')
  })
})

describe('the prompt sent to the model', () => {
  const input = buildCommentaryInput({ duel, puzzle, submissions: [...chronological].reverse(), names })!
  const prompt = buildPrompt(input)

  it('contains each player\'s own code and the real scores, winner and reason', () => {
    expect(prompt).toContain(FIXED) // Host's winning code
    expect(prompt).toContain(`Host: ${TOTAL} of ${TOTAL}`)
    expect(prompt).toContain(`Alice: 6 of ${TOTAL}`)
    expect(prompt).toContain('Host won by passing all 7 tests first.')
    expect(prompt).toMatch(/not tied/i)
    expect(prompt).toMatch(/different code/i)
  })

  it('shows the fixed code only under the player who wrote it', () => {
    const hostBlock = prompt.slice(prompt.indexOf("HOST'S BEST SOLUTION"), prompt.indexOf("ALICE'S BEST SOLUTION"))
    const aliceBlock = prompt.slice(prompt.indexOf("ALICE'S BEST SOLUTION"))
    expect(hostBlock).toContain('a-z0-9')
    expect(aliceBlock).not.toContain('a-z0-9')
    expect(aliceBlock).toContain('/[^a-z]/g')
  })

  it('tells the model (in its instructions) not to invent scores, ties or tiebreakers', () => {
    expect(SYSTEM_PROMPT).toMatch(/must not contradict/i)
    expect(SYSTEM_PROMPT).toMatch(/never state or imply a score, a tie, a tiebreaker/i)
  })
})

describe('findContradiction rejects commentary that disagrees with the record', () => {
  const input = buildCommentaryInput({ duel, puzzle, submissions: chronological, names })!

  it('accepts a faithful commentary', () => {
    expect(findContradiction('Host fixed the regex to keep digits and passed 7 of 7. Alice stayed at 6/7.', input)).toBeNull()
  })

  it('rejects the reported failure: a tie and a tiebreaker', () => {
    expect(findContradiction('Both players scored 6/7 and Host won on a tiebreaker.', input)).toMatch(/tie|score/i)
  })

  it('rejects "identical code" when the code differs', () => {
    expect(findContradiction('Both submitted identical code with the original regex.', input)).toMatch(/identical|same/i)
  })

  it('rejects a score nobody had', () => {
    expect(findContradiction('Alice reached 4 of 7 before giving up.', input)).toMatch(/score/i)
  })
})
