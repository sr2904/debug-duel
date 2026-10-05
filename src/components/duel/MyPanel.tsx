import { useEffect, useRef, useState } from 'react'
import { useMutations } from 'deepspace'
import { Button, useToast } from '@/components/ui'
import { callAction } from '@/lib/duel/api'
import { runTestsInWorker } from '@/lib/duel/runTests'
import type { Activity } from '@/lib/duel/types'
import type { EntryData, TestCase, TestOutcome } from '../../shared/duel-types'
import { CodeBox } from './CodeBox'
import { TestResults } from './TestResults'

const SAVE_DEBOUNCE_MS = 300
const IDLE_AFTER_MS = 1500

interface MyPanelProps {
  duelId: string
  entryId: string
  /** The code stored for this player (used to seed the editor, e.g. after a reload). */
  savedCode: string
  setActivity: (a: Activity) => void
}

/**
 * The signed-in player's own editor. Edits are saved to their `entries` row a
 * moment after typing stops, which is how the opponent and spectators watch live.
 * The permission system only lets the owner of the row write to it.
 */
export function MyPanel({ duelId, entryId, savedCode, setActivity }: MyPanelProps) {
  const { put, ready } = useMutations<EntryData>('entries')
  const { error: showError } = useToast()
  const [code, setCode] = useState(savedCode)
  const [outcomes, setOutcomes] = useState<TestOutcome[] | null>(null)
  const [running, setRunning] = useState(false)
  const touched = useRef(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const testsCache = useRef<{ fnName: string; tests: TestCase[] } | null>(null)

  // Until the player types, follow the stored code (it arrives right after the round starts).
  useEffect(() => {
    if (!touched.current) setCode(savedCode)
  }, [savedCode])

  // Debounced autosave of what the player has typed.
  useEffect(() => {
    if (!touched.current || !ready) return
    const timer = setTimeout(() => void put(entryId, { code }), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [code, entryId, ready, put])

  function handleChange(next: string) {
    touched.current = true
    setCode(next)
    setActivity('typing')
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setActivity('idle'), IDLE_AFTER_MS)
  }

  async function runTests() {
    setRunning(true)
    clearTimeout(idleTimer.current)
    setActivity('testing')
    try {
      if (!testsCache.current) {
        const res = await callAction<{ fnName: string; tests: TestCase[] }>('getTests', { duelId })
        if (!res.success) return showError('Could not load tests', res.error)
        testsCache.current = res.data
      }
      const { fnName, tests } = testsCache.current
      const results = await runTestsInWorker(code, fnName, tests)
      setOutcomes(results)

      // Save the exact code that was tested, then report the run. The server
      // stamps it, validates it, and decides whether it ends the round.
      void put(entryId, { code })
      const passed = results.filter((o) => o.passed).length
      const res = await callAction('submitResult', { duelId, passed, total: results.length, code })
      if (!res.success) showError('Result not recorded', res.error)
    } finally {
      setRunning(false)
      setActivity('idle')
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="min-h-64 flex-1">
        <CodeBox value={code} onChange={handleChange} testId="my-editor" />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={runTests} loading={running} disabled={!ready} data-testid="run-tests-btn">
          Run tests
        </Button>
        <span className="text-xs text-muted-foreground">Tests are hidden. You see pass or fail for each.</span>
      </div>
      {outcomes && <TestResults outcomes={outcomes} />}
    </div>
  )
}
