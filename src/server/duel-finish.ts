/**
 * Closing a round: pick the winner, mark the duel finished, queue the commentary.
 *
 * Written against a tiny `FinishStore` so the same code runs from a server
 * action (a player or host asked) and from the scheduled sweep (nobody asked,
 * the clock did). That is what makes round completion server-authoritative:
 * an expired round resolves even if every browser has been closed.
 */

import type { ActionTools } from 'deepspace/worker'
import { bestRuns, winnerByScore } from '../shared/duel-rules'
import type { DuelData, EndReason, EntryData, SolutionData } from '../shared/duel-types'

export interface DuelRow {
  id: string
  data: DuelData
}

/** The handful of database operations finishing needs. */
export interface FinishStore {
  getDuel(duelId: string): Promise<DuelData | null>
  runningDuels(): Promise<DuelRow[]>
  /** Every recorded run with its code (the `solutions` collection: server-only). */
  solutionsFor(duelId: string): Promise<SolutionData[]>
  /** The players' live editor rows; only used when a player never ran their tests. */
  entriesFor(duelId: string): Promise<EntryData[]>
  updateDuel(duelId: string, patch: Partial<DuelData>): Promise<void>
}

const MAX_REVEAL_CHARS = 20_000

/**
 * Close the round. Besides picking the winner this is the moment the code is revealed:
 * each player's best recorded solution is copied onto the duel row, which everyone can read.
 * (Before this, a player's code is visible only to them and to registered spectators.)
 * `solvedBy` is the player who just passed every test, if any.
 * Returns false when it was already finished (so finishing twice is harmless).
 */
export async function finishDuel(
  store: FinishStore,
  duelId: string,
  reason: EndReason,
  solvedBy?: string,
  now = Date.now(),
): Promise<boolean> {
  // Re-read right before writing: a client, the sweep, or a winning submission may have got here first.
  const duel = await store.getDuel(duelId)
  if (!duel || duel.status !== 'running') return false

  const solutions = await store.solutionsFor(duelId)
  const players = [duel.p1Id, duel.p2Id].filter((id): id is string => !!id)
  const best = bestRuns(solutions)
  const entries = await store.entriesFor(duelId)
  const revealed = (id?: string) =>
    (id ? (best.get(id)?.code ?? entries.find((e) => e.userId === id)?.code ?? '') : '').slice(0, MAX_REVEAL_CHARS)

  await store.updateDuel(duelId, {
    status: 'finished',
    finishedAt: now,
    endReason: reason,
    winnerId: solvedBy ?? winnerByScore(solutions, players),
    commentaryStatus: 'pending',
    p1Code: revealed(duel.p1Id),
    p2Code: revealed(duel.p2Id),
  })
  return true
}

export const isExpired = (duel: DuelData, now: number) =>
  duel.status === 'running' && duel.endsAt !== undefined && now >= duel.endsAt

/** Scheduled sweep: finish every running duel whose deadline has passed. Returns the ids it closed. */
export async function finishExpiredDuels(store: FinishStore, now = Date.now()): Promise<string[]> {
  const closed: string[] = []
  for (const { id, data } of await store.runningDuels()) {
    if (!isExpired(data, now)) continue
    try {
      if (await finishDuel(store, id, 'timeout', undefined, now)) closed.push(id)
    } catch (err) {
      // One broken duel must not stop the others from being closed.
      console.error('[expire-duels] could not finish', id, err instanceof Error ? err.message : String(err))
    }
  }
  return closed
}

/** FinishStore backed by a server action's tools. */
export function actionStore(tools: ActionTools): FinishStore {
  return {
    async getDuel(duelId) {
      const res = await tools.get<DuelData>('duels', duelId)
      return res.success ? res.data.record.data : null
    },
    async runningDuels() {
      const res = await tools.query<DuelData>('duels', { where: { status: 'running' }, limit: 500 })
      return res.success ? res.data.records.map((r) => ({ id: r.recordId, data: r.data })) : []
    },
    async solutionsFor(duelId) {
      const res = await tools.query<SolutionData>('solutions', { where: { duelId }, limit: 500 })
      return res.success ? res.data.records.map((r) => r.data) : []
    },
    async entriesFor(duelId) {
      const res = await tools.query<EntryData>('entries', { where: { duelId }, limit: 10 })
      return res.success ? res.data.records.map((r) => r.data) : []
    },
    async updateDuel(duelId, patch) {
      const res = await tools.update('duels', duelId, patch)
      if (!res.success) throw new Error(res.error)
    },
  }
}

interface CronRecords {
  query(collection: string, opts?: { where?: Record<string, unknown>; limit?: number }): Promise<unknown[]>
  update(collection: string, recordId: string, data: Record<string, unknown>): Promise<unknown>
}

/** FinishStore backed by the cron context's records API (runs as the app owner, RBAC bypassed). */
export function cronStore(records: CronRecords): FinishStore {
  type Envelope<T> = { recordId: string; data: T }
  return {
    async getDuel(duelId) {
      const rows = (await records.query('duels', { where: { recordId: duelId }, limit: 1 })) as Envelope<DuelData>[]
      return rows[0]?.data ?? null
    },
    async runningDuels() {
      const rows = (await records.query('duels', { where: { status: 'running' }, limit: 500 })) as Envelope<DuelData>[]
      return rows.map((r) => ({ id: r.recordId, data: r.data }))
    },
    async solutionsFor(duelId) {
      const rows = (await records.query('solutions', { where: { duelId }, limit: 500 })) as Envelope<SolutionData>[]
      return rows.map((r) => r.data)
    },
    async entriesFor(duelId) {
      const rows = (await records.query('entries', { where: { duelId }, limit: 10 })) as Envelope<EntryData>[]
      return rows.map((r) => r.data)
    },
    async updateDuel(duelId, patch) {
      await records.update('duels', duelId, patch)
    },
  }
}
