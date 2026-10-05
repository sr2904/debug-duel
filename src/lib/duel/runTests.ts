import type { TestCase, TestOutcome } from '../../shared/duel-types'

const DEFAULT_TIMEOUT_MS = 3000

/**
 * Run the hidden tests against the player's code in a Web Worker.
 * If the worker has not finished within `timeoutMs` it is terminated and every
 * unfinished test counts as failed ("Timed out"), so a `while (true)` can't hang the page.
 *
 * Trade-off: this runs on the player's own machine, so a determined player could
 * fake a pass. The server still stamps and validates every submission; see BUILD_LOG.md.
 */
export function runTestsInWorker(
  code: string,
  fnName: string,
  tests: TestCase[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<TestOutcome[]> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./test-worker.ts', import.meta.url), { type: 'module' })
    const outcomes: Array<TestOutcome | undefined> = new Array(tests.length).fill(undefined)

    function finish(reasonForMissing: string) {
      clearTimeout(timer)
      worker.terminate()
      resolve(tests.map((t, i) => outcomes[i] ?? { name: t.name, passed: false, error: reasonForMissing }))
    }

    const timer = setTimeout(() => finish('Timed out (infinite loop?)'), timeoutMs)

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as { type: string; index?: number; outcome?: TestOutcome; error?: string }
      if (msg.type === 'result' && msg.index !== undefined) outcomes[msg.index] = msg.outcome
      else if (msg.type === 'compile-error') finish(msg.error ?? 'Your code did not compile')
      else if (msg.type === 'done') finish('Did not finish')
    }
    worker.onerror = (event) => finish(event.message || 'Script error')
    worker.postMessage({ code, fnName, tests })
  })
}
