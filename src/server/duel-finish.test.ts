/**
 * Round completion must not depend on any browser being connected.
 * These tests call the same code the scheduled sweep runs, against an
 * in-memory store: no client, no WebSocket, no timers.
 */

import { describe, expect, it } from 'vitest'
import type { DuelData, EntryData, SolutionData } from '../shared/duel-types'
import { finishDuel, finishExpiredDuels, type FinishStore } from './duel-finish'

const T0 = 1_000_000

function duel(overrides: Partial<DuelData> = {}): DuelData {
  return {
    title: 'd', hostId: 'host', status: 'running', p1Id: 'a', p2Id: 'b', durationSec: 60,
    startedAt: T0, endsAt: T0 + 60_000, testCount: 7, commentaryStatus: 'none', ...overrides,
  }
}

const sub = (userId: string, passed: number, at: number, code = `// ${userId} @${at}`): SolutionData =>
  ({ duelId: 'x', userId, passed, total: 7, code, at })

function memoryStore(duels: Record<string, DuelData>, solutions: Record<string, SolutionData[]> = {}, entries: Record<string, EntryData[]> = {}) {
  const store: FinishStore & { duels: Record<string, DuelData>; writes: number } = {
    duels,
    writes: 0,
    async getDuel(id) { return duels[id] ?? null },
    async runningDuels() { return Object.entries(duels).filter(([, d]) => d.status === 'running').map(([id, data]) => ({ id, data })) },
    async solutionsFor(id) { return solutions[id] ?? [] },
    async entriesFor(id) { return entries[id] ?? [] },
    async updateDuel(id, patch) { store.writes++; duels[id] = { ...duels[id], ...patch } },
  }
  return store
}

describe('finishExpiredDuels (the scheduled sweep)', () => {
  it('closes an expired round with nobody connected, and the better score wins', async () => {
    const store = memoryStore({ d1: duel() }, { d1: [sub('a', 3, T0 + 5_000), sub('b', 6, T0 + 9_000)] })
    const closed = await finishExpiredDuels(store, T0 + 61_000)
    expect(closed).toEqual(['d1'])
    expect(store.duels.d1).toMatchObject({
      status: 'finished', endReason: 'timeout', winnerId: 'b', finishedAt: T0 + 61_000, commentaryStatus: 'pending',
    })
  })

  it('leaves a round alone until its deadline has passed', async () => {
    const store = memoryStore({ d1: duel() })
    expect(await finishExpiredDuels(store, T0 + 59_999)).toEqual([])
    expect(store.duels.d1.status).toBe('running')
  })

  it('calls it a draw when nobody passed a test', async () => {
    const store = memoryStore({ d1: duel() }, { d1: [sub('a', 0, T0 + 1_000)] })
    await finishExpiredDuels(store, T0 + 70_000)
    expect(store.duels.d1).toMatchObject({ status: 'finished', winnerId: '' })
  })

  it('never touches lobby or already-finished duels', async () => {
    const finished = duel({ status: 'finished', finishedAt: T0 + 30_000, winnerId: 'a', endReason: 'solved' })
    const store = memoryStore({ lobby: duel({ status: 'lobby', endsAt: undefined }), done: finished })
    expect(await finishExpiredDuels(store, T0 + 999_999)).toEqual([])
    expect(store.writes).toBe(0)
    expect(store.duels.done).toEqual(finished)
  })

  it('is safe to run twice: the second sweep changes nothing', async () => {
    const store = memoryStore({ d1: duel() }, { d1: [sub('a', 2, T0 + 1_000)] })
    await finishExpiredDuels(store, T0 + 61_000)
    expect(await finishExpiredDuels(store, T0 + 120_000)).toEqual([])
    expect(store.writes).toBe(1)
    expect(store.duels.d1.finishedAt).toBe(T0 + 61_000)
  })

  it('keeps going if one duel fails to update', async () => {
    const store = memoryStore({ bad: duel(), good: duel() })
    const original = store.updateDuel
    store.updateDuel = async (id, patch) => {
      if (id === 'bad') throw new Error('boom')
      return original(id, patch)
    }
    expect(await finishExpiredDuels(store, T0 + 61_000)).toEqual(['good'])
    expect(store.duels.good.status).toBe('finished')
    expect(store.duels.bad.status).toBe('running')
  })
})

describe('finishDuel', () => {
  it('does not overwrite a round that a winning submission already ended', async () => {
    const store = memoryStore({ d1: duel() }, { d1: [sub('a', 7, T0 + 1_000), sub('b', 6, T0 + 2_000)] })
    expect(await finishDuel(store, 'd1', 'solved', 'a', T0 + 1_000)).toBe(true)
    // The deadline sweep arrives afterwards: it must not change the winner or reason.
    expect(await finishDuel(store, 'd1', 'timeout', undefined, T0 + 61_000)).toBe(false)
    expect(store.duels.d1).toMatchObject({ winnerId: 'a', endReason: 'solved', finishedAt: T0 + 1_000 })
  })
})

describe('code reveal at round end', () => {
  it('copies each player\'s BEST recorded code onto the duel row when the round ends', async () => {
    const store = memoryStore(
      { d1: duel() },
      { d1: [sub('a', 2, T0 + 1_000, 'a-early'), sub('a', 7, T0 + 5_000, 'a-fixed'), sub('b', 4, T0 + 2_000, 'b-best'), sub('b', 1, T0 + 9_000, 'b-worse-later')] },
    )
    await finishDuel(store, 'd1', 'solved', 'a', T0 + 5_000)
    expect(store.duels.d1).toMatchObject({ p1Code: 'a-fixed', p2Code: 'b-best' })
  })

  it('falls back to the live editor contents for a player who never ran their tests', async () => {
    const store = memoryStore(
      { d1: duel() },
      { d1: [sub('a', 3, T0 + 1_000, 'a-code')] },
      { d1: [{ duelId: 'd1', userId: 'b', code: 'b-live-editor' }] },
    )
    await finishDuel(store, 'd1', 'timeout', undefined, T0 + 61_000)
    expect(store.duels.d1).toMatchObject({ p1Code: 'a-code', p2Code: 'b-live-editor' })
  })

  it('does not reveal anything while the round is still running', async () => {
    const store = memoryStore({ d1: duel() }, { d1: [sub('a', 3, T0 + 1_000, 'secret')] })
    await finishExpiredDuels(store, T0 + 30_000) // not expired yet
    expect(store.duels.d1.p1Code).toBeUndefined()
    expect(store.duels.d1.p2Code).toBeUndefined()
  })

  it('reveals through the scheduled sweep too (nobody connected)', async () => {
    const store = memoryStore({ d1: duel() }, { d1: [sub('a', 3, T0 + 1_000, 'a-code'), sub('b', 5, T0 + 2_000, 'b-code')] })
    await finishExpiredDuels(store, T0 + 61_000)
    expect(store.duels.d1).toMatchObject({ winnerId: 'b', p1Code: 'a-code', p2Code: 'b-code' })
  })
})
