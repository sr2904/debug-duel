/**
 * Runs inside a Web Worker. Player code executes here, off the page's main
 * thread and with no access to the DOM, so a crash or an infinite loop can be
 * killed from outside (see runTests.ts) without freezing the editor.
 */

import { compilePlayerCode, runTestCase } from '../../shared/run-tests'
import type { TestCase } from '../../shared/duel-types'

self.onmessage = (event: MessageEvent<{ code: string; fnName: string; tests: TestCase[] }>) => {
  const { code, fnName, tests } = event.data
  const compiled = compilePlayerCode(code, fnName)
  if ('error' in compiled) {
    self.postMessage({ type: 'compile-error', error: compiled.error })
    return
  }
  // Post each result as it finishes, so a hang on test N still keeps results 1..N-1.
  tests.forEach((test, index) => {
    self.postMessage({ type: 'result', index, outcome: runTestCase(compiled.fn, test) })
  })
  self.postMessage({ type: 'done' })
}
