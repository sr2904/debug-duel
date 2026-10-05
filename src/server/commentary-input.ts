/**
 * Turns the server's own records into the facts the commentary model sees.
 *
 * Everything here comes from recorded submissions and the duel row, never from
 * the live editors and never from the order a query happens to return rows in
 * (tools.query defaults to newest-first, which once made the model see each
 * player's *first* run as their last).
 */

import { bestRuns } from '../shared/duel-rules'
import type { DuelData, SolutionData } from '../shared/duel-types'
import type { Puzzle } from './puzzles/types'

export interface PlayerFacts {
  name: string
  /** Best score across all of this player's recorded runs. */
  bestPassed: number
  total: number
  runs: number
  /** Code of the player's best-scoring run (the earliest one, if several tie). */
  code: string
  /** True if that code is the original buggy code, untouched. */
  unchanged: boolean
}

export interface CommentaryInput {
  puzzleDescription: string
  buggyCode: string
  referenceFix: string
  /** Human sentence: who won and why, straight from the duel row. */
  result: string
  winnerName: string | null
  scoresTied: boolean
  sameCode: boolean
  players: [PlayerFacts, PlayerFacts]
}

const NEVER_RAN = '(this player never ran their tests)'

export function buildCommentaryInput(args: {
  duel: DuelData
  puzzle: Puzzle
  /** Recorded runs with their code (the server-only `solutions` collection). */
  solutions: SolutionData[]
  names: Record<string, string>
}): CommentaryInput | null {
  const { duel, puzzle, solutions, names } = args
  const ids = [duel.p1Id ?? '', duel.p2Id ?? ''] as const
  const total = duel.testCount ?? puzzle.tests.length
  if (!solutions.some((s) => ids.includes(s.userId))) return null

  const best = bestRuns(solutions)
  const facts = (id: string, i: number): PlayerFacts => {
    const run = best.get(id)
    const code = run?.code ?? NEVER_RAN
    return {
      name: names[id] || `Player ${i + 1}`,
      bestPassed: run?.passed ?? 0,
      total,
      runs: solutions.filter((s) => s.userId === id).length,
      code,
      unchanged: run !== undefined && run.code.trim() === puzzle.buggyCode.trim(),
    }
  }
  const players: [PlayerFacts, PlayerFacts] = [facts(ids[0], 0), facts(ids[1], 1)]
  const winner = duel.winnerId ? players[ids.indexOf(duel.winnerId)] : undefined

  let result: string
  if (!winner) result = 'The round ended in a draw: nobody passed a single test.'
  else if (duel.endReason === 'solved') result = `${winner.name} won by passing all ${total} tests first.`
  else if (duel.endReason === 'host_ended') result = `${winner.name} won: the host ended the round and ${winner.name} had the better best score.`
  else result = `${winner.name} won: time ran out and ${winner.name} had the better best score.`

  return {
    puzzleDescription: puzzle.description,
    buggyCode: puzzle.buggyCode,
    referenceFix: puzzle.referenceFix,
    result,
    winnerName: winner?.name ?? null,
    scoresTied: players[0].bestPassed === players[1].bestPassed,
    sameCode: players[0].code.trim() === players[1].code.trim(),
    players,
  }
}
