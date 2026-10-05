/**
 * Validates the seed puzzles with the same rule an AI-generated puzzle would
 * have to meet: the buggy version FAILS at least one test, the reference fix
 * PASSES all of them.
 */

import { describe, expect, it } from 'vitest'
import { runAllTests } from '../../shared/run-tests'
import { seedPuzzles } from './seed-puzzles'

describe('seed puzzles', () => {
  it('has five puzzles with unique ids', () => {
    expect(seedPuzzles).toHaveLength(5)
    expect(new Set(seedPuzzles.map((p) => p.id)).size).toBe(5)
  })

  for (const puzzle of seedPuzzles) {
    describe(puzzle.id, () => {
      it('has a buggy version that fails at least one test', () => {
        const outcomes = runAllTests(puzzle.buggyCode, puzzle.fnName, puzzle.tests)
        expect(outcomes.some((o) => !o.passed)).toBe(true)
      })

      it('has a reference fix that passes every test', () => {
        const outcomes = runAllTests(puzzle.referenceFix, puzzle.fnName, puzzle.tests)
        expect(outcomes.filter((o) => !o.passed)).toEqual([])
      })

      it('has a buggy version that still passes some test (so it is not a blank page)', () => {
        const outcomes = runAllTests(puzzle.buggyCode, puzzle.fnName, puzzle.tests)
        expect(outcomes.some((o) => o.passed)).toBe(true)
      })

      it('has at least five tests with unique names', () => {
        expect(puzzle.tests.length).toBeGreaterThanOrEqual(5)
        expect(new Set(puzzle.tests.map((t) => t.name)).size).toBe(puzzle.tests.length)
      })
    })
  }
})
