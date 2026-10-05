import { Check, X } from 'lucide-react'
import type { TestOutcome } from '../../shared/duel-types'

/** Per-test pass/fail after a run. Inputs and expected values stay hidden. */
export function TestResults({ outcomes }: { outcomes: TestOutcome[] }) {
  const passed = outcomes.filter((o) => o.passed).length
  return (
    <div className="rounded-md border border-border bg-card p-3" data-testid="test-results">
      <p className="mb-2 text-sm font-medium" data-testid="test-summary">
        {passed} of {outcomes.length} tests passed
      </p>
      <ul className="space-y-1 text-sm">
        {outcomes.map((o) => (
          <li key={o.name} className="flex items-start gap-2">
            {o.passed ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <span>
              {o.name}
              {!o.passed && o.error ? <span className="text-muted-foreground"> — {o.error}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
