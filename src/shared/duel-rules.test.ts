import { describe, expect, it } from 'vitest'
import { clampDuration, isTestDuel, winnerByScore } from './duel-rules'

const run = (userId: string, passed: number, at: number) => ({ userId, passed, at })

describe('winnerByScore', () => {
  it('gives the round to the player with more passing tests', () => {
    expect(winnerByScore([run('a', 3, 10), run('b', 5, 20)], ['a', 'b'])).toBe('b')
  })

  it('uses each player\'s best run, not their latest', () => {
    expect(winnerByScore([run('a', 6, 10), run('a', 2, 30), run('b', 4, 20)], ['a', 'b'])).toBe('a')
  })

  it('breaks a tie by who reached the score first', () => {
    expect(winnerByScore([run('a', 4, 50), run('b', 4, 20)], ['a', 'b'])).toBe('b')
  })

  it('is a draw when nobody passed anything', () => {
    expect(winnerByScore([run('a', 0, 10), run('b', 0, 20)], ['a', 'b'])).toBe('')
    expect(winnerByScore([], ['a', 'b'])).toBe('')
  })

  it('ignores submissions from non-players', () => {
    expect(winnerByScore([run('spectator', 9, 1), run('a', 1, 5)], ['a', 'b'])).toBe('a')
  })
})

describe('clampDuration', () => {
  it('keeps sensible values, clamps extremes, and defaults to five minutes', () => {
    expect(clampDuration(180)).toBe(180)
    expect(clampDuration(5)).toBe(60)
    expect(clampDuration(999_999)).toBe(900)
    expect(clampDuration(undefined)).toBe(300)
    expect(clampDuration(Number.NaN)).toBe(300)
  })
})

describe('isTestDuel', () => {
  it('flags the titles Playwright creates and nothing else', () => {
    expect(isTestDuel('__test-1700000000__ duel')).toBe(true)
    expect(isTestDuel('Friday showdown')).toBe(false)
    expect(isTestDuel('my __test- duel')).toBe(false)
  })
})
