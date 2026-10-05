/**
 * Pure helpers for running one hidden test against player code.
 *
 * Used in two places: the browser's test Web Worker (what players actually
 * run) and the seed-puzzle unit test (which proves every seed is valid).
 * Nothing here touches the DOM, so it works in a Worker and in Node.
 */

import type { TestCase, TestOutcome } from './duel-types'

/** Turn the player's source into a callable function, or explain why we can't. */
export function compilePlayerCode(code: string, fnName: string): { fn: (...args: unknown[]) => unknown } | { error: string } {
  try {
    // The player's code declares `function <fnName>(...)`; we return that function.
    const factory = new Function(`${code}\n;return typeof ${fnName} === 'function' ? ${fnName} : undefined;`)
    const fn = factory()
    if (typeof fn !== 'function') return { error: `Expected a function named ${fnName}` }
    return { fn }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/** Structural equality for JSON-like values (objects compare by own keys, ignoring prototype). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}

/** Run a single test. Arguments are cloned so a mutating solution can't corrupt later tests. */
export function runTestCase(fn: (...args: unknown[]) => unknown, test: TestCase): TestOutcome {
  try {
    const actual = fn(...structuredClone(test.args))
    return deepEqual(actual, test.expected)
      ? { name: test.name, passed: true }
      : { name: test.name, passed: false, error: 'Wrong result' }
  } catch (err) {
    return { name: test.name, passed: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Run every test synchronously. Fine in Node tests; in the browser use the Worker with a timeout. */
export function runAllTests(code: string, fnName: string, tests: TestCase[]): TestOutcome[] {
  const compiled = compilePlayerCode(code, fnName)
  if ('error' in compiled) return tests.map((t) => ({ name: t.name, passed: false, error: compiled.error }))
  return tests.map((t) => runTestCase(compiled.fn, t))
}
