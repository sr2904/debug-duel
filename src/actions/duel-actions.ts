/**
 * Server actions for a duel. These run in the worker as the app, so they are the
 * single source of truth for everything a client must not decide itself:
 * who the players are, when the round starts and ends, the hidden tests, and
 * who won. Every action re-checks the caller against the duel record, because
 * an action that trusts a client-supplied id has authorized nothing.
 */

import type { ActionHandler, ActionResult, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { DuelData, EntryData, SubmissionData } from '../shared/duel-types'
import { writeCommentary } from '../server/commentary'
import { buildCommentaryInput } from '../server/commentary-input'
import { SUBMIT_GRACE_MS, clampDuration } from '../shared/duel-rules'
import { actionStore, finishDuel } from '../server/duel-finish'
import { getSeedPuzzle, pickRandomPuzzle } from '../server/puzzles/seed-puzzles'

type Handler = ActionHandler<Env>

const fail = (error: string): ActionResult<never> => ({ success: false, error })
const ok = <T>(data: T): ActionResult<T> => ({ success: true, data })

const MAX_CODE_CHARS = 20_000

const isPlayer = (duel: DuelData, userId: string) => duel.p1Id === userId || duel.p2Id === userId

/** Load a duel by id, or return the error to send back. */
async function loadDuel(tools: ActionTools, duelId: unknown): Promise<{ duel: DuelData } | { error: string }> {
  if (typeof duelId !== 'string' || !duelId) return { error: 'Missing duelId' }
  const res = await tools.get<DuelData>('duels', duelId)
  if (!res.success) return { error: 'Duel not found' }
  return { duel: res.data.record.data }
}

/** All recorded runs for a duel, oldest first. Sorted here because tools.query defaults to newest-first. */
async function loadSubmissions(tools: ActionTools, duelId: string): Promise<SubmissionData[]> {
  const res = await tools.query<SubmissionData>('submissions', { where: { duelId }, limit: 500 })
  return res.success ? res.data.records.map((r) => r.data).sort((x, y) => x.at - y.at) : []
}

export const duelActions: Record<string, Handler> = {
  /** Lets clients correct for clock skew so everyone sees the same countdown. */
  serverTime: async () => ok({ now: Date.now() }),

  /** Take a player slot. Everyone who never calls this is a spectator. */
  joinDuel: async ({ userId, params, tools }) => {
    const loaded = await loadDuel(tools, params.duelId)
    if ('error' in loaded) return fail(loaded.error)
    const { duel } = loaded
    const duelId = params.duelId as string

    if (isPlayer(duel, userId)) return ok({ slot: duel.p1Id === userId ? 'p1' : 'p2' })
    if (duel.status !== 'lobby') return fail('This duel has already started')

    const slotField = !duel.p1Id ? 'p1Id' : !duel.p2Id ? 'p2Id' : null
    if (!slotField) return fail('Both player slots are taken')

    await tools.update('duels', duelId, { [slotField]: userId })
    // Re-read: if two people clicked at once, only the one whose id stuck keeps the slot.
    const after = await loadDuel(tools, duelId)
    if ('error' in after || after.duel[slotField] !== userId) return fail('Someone else just took that slot')

    const entry = await tools.create<EntryData>('entries', { duelId, userId, code: '' })
    if (!entry.success) {
      await tools.update('duels', duelId, { [slotField]: '' })
      return fail(entry.error)
    }
    return ok({ slot: slotField === 'p1Id' ? 'p1' : 'p2' })
  },

  /** Host only. Picks a puzzle and starts the server clock. */
  startRound: async ({ userId, params, tools }) => {
    const loaded = await loadDuel(tools, params.duelId)
    if ('error' in loaded) return fail(loaded.error)
    const { duel } = loaded
    const duelId = params.duelId as string

    if (duel.hostId !== userId) return fail('Only the host can start the round')
    if (duel.status !== 'lobby') return fail('The round has already started')
    if (!duel.p1Id || !duel.p2Id) return fail('Two players need to join first')

    const puzzle = pickRandomPuzzle()
    const startedAt = Date.now()
    const durationSec = clampDuration(duel.durationSec)

    // Give both players the buggy code first, then flip the duel to "running",
    // so nobody sees a running round with an empty editor.
    const entries = await tools.query<EntryData>('entries', { where: { duelId } })
    if (!entries.success) return fail(entries.error)
    for (const entry of entries.data.records) {
      await tools.update('entries', entry.recordId, { code: puzzle.buggyCode })
    }

    return tools.update('duels', duelId, {
      status: 'running',
      puzzleId: puzzle.id,
      puzzleTitle: puzzle.title,
      puzzleDescription: puzzle.description,
      buggyCode: puzzle.buggyCode,
      testCount: puzzle.tests.length,
      startedAt,
      durationSec,
      endsAt: startedAt + durationSec * 1000,
    })
  },

  /** Players only, while the round is running. The hidden tests never ship in the page bundle. */
  getTests: async ({ userId, params, tools }) => {
    const loaded = await loadDuel(tools, params.duelId)
    if ('error' in loaded) return fail(loaded.error)
    const { duel } = loaded

    if (!isPlayer(duel, userId)) return fail('Only players can run tests')
    if (duel.status !== 'running') return fail('The round is not running')
    const puzzle = getSeedPuzzle(duel.puzzleId ?? '')
    if (!puzzle) return fail('Puzzle not found')
    return ok({ fnName: puzzle.fnName, tests: puzzle.tests })
  },

  /**
   * A player reports a test run. We validate it against the duel, stamp it with
   * the server clock, and end the round if it passes everything.
   * Known limit: the pass count itself is computed in the player's browser.
   */
  submitResult: async ({ userId, params, tools }) => {
    const loaded = await loadDuel(tools, params.duelId)
    if ('error' in loaded) return fail(loaded.error)
    const { duel } = loaded
    const duelId = params.duelId as string

    if (!isPlayer(duel, userId)) return fail('Only players can submit results')
    if (duel.status !== 'running') return fail('The round is not running')

    const { passed, total, code } = params
    if (!Number.isInteger(passed) || !Number.isInteger(total) || typeof code !== 'string') {
      return fail('Invalid submission')
    }
    const passedCount = passed as number
    if (total !== duel.testCount || passedCount < 0 || passedCount > (total as number)) {
      return fail('Invalid submission')
    }

    const now = Date.now()
    if (now > (duel.endsAt ?? 0) + SUBMIT_GRACE_MS) {
      await finishDuel(actionStore(tools), duelId, 'timeout')
      return fail('Time is up')
    }

    const saved = await tools.create<SubmissionData>('submissions', {
      duelId,
      userId,
      passed: passedCount,
      total: total as number,
      code: code.slice(0, MAX_CODE_CHARS),
      at: now,
    })
    if (!saved.success) return fail(saved.error)

    const solved = passedCount === total
    if (solved) await finishDuel(actionStore(tools), duelId, 'solved', userId)
    return ok({ solved })
  },

  /**
   * End the round. The host can do it any time; anyone can do it once the
   * deadline has passed, so a host who closed their tab can't strand the room.
   */
  finishRound: async ({ userId, params, tools }) => {
    const loaded = await loadDuel(tools, params.duelId)
    if ('error' in loaded) return fail(loaded.error)
    const { duel } = loaded
    const duelId = params.duelId as string

    if (duel.status === 'finished') return ok({ alreadyFinished: true })
    if (duel.status !== 'running') return fail('The round has not started')

    const expired = Date.now() >= (duel.endsAt ?? Infinity)
    if (!expired && duel.hostId !== userId) return fail('Only the host can end the round early')

    await finishDuel(actionStore(tools), duelId, expired ? 'timeout' : 'host_ended')
    return ok({ alreadyFinished: false })
  },

  /**
   * Writes the post-round AI commentary. Anyone who opens a finished duel may ask:
   * the sweep can close a round with nobody present, so the first visitor triggers it.
   * It runs at most once per duel (pending -> running -> done/failed/none).
   * If the AI call fails the result still stands.
   */
  generateCommentary: async ({ params, tools, env }) => {
    const loaded = await loadDuel(tools, params.duelId)
    if ('error' in loaded) return fail(loaded.error)
    const { duel } = loaded
    const duelId = params.duelId as string

    if (duel.status !== 'finished') return fail('The round is not finished')
    if (duel.commentaryStatus !== 'pending') return ok({ status: duel.commentaryStatus })

    await tools.update('duels', duelId, { commentaryStatus: 'running' })
    try {
      const puzzle = getSeedPuzzle(duel.puzzleId ?? '')
      const submissions = await loadSubmissions(tools, duelId)
      const names: Record<string, string> = {}
      for (const id of [duel.p1Id, duel.p2Id]) {
        if (!id) continue
        // Read only the display name; never pass a raw users row anywhere.
        const user = await tools.get('users', id)
        if (user.success) names[id] = String((user.data.record.data as { name?: string }).name ?? '')
      }
      const input = puzzle ? buildCommentaryInput({ duel, puzzle, submissions, names }) : null
      if (!input) {
        await tools.update('duels', duelId, { commentaryStatus: 'none' })
        return ok({ status: 'none' })
      }
      const commentary = await writeCommentary(env, input)
      await tools.update('duels', duelId, { commentary, commentaryStatus: 'done' })
      return ok({ status: 'done' })
    } catch (err) {
      console.error('[commentary] failed', err instanceof Error ? err.message : String(err))
      await tools.update('duels', duelId, { commentaryStatus: 'failed' })
      return ok({ status: 'failed' })
    }
  },
}
