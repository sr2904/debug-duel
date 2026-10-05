import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface CodeBoxProps {
  value: string
  onChange?: (code: string) => void
  readOnly?: boolean
  testId: string
}

/** A plain monospace textarea. Read-only boxes show another player's live code. */
export function CodeBox({ value, onChange, readOnly = false, testId }: CodeBoxProps) {
  // Tab inserts two spaces instead of moving focus out of the editor.
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab' || readOnly || !onChange) return
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart, selectionEnd } = el
    onChange(`${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`)
    requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2))
  }

  return (
    <textarea
      data-testid={testId}
      value={value}
      readOnly={readOnly}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        'h-full min-h-64 w-full resize-none rounded-md border border-border bg-card p-3 font-mono text-sm leading-relaxed text-foreground outline-none',
        readOnly ? 'cursor-default opacity-90' : 'focus-visible:ring-2 focus-visible:ring-ring',
      )}
    />
  )
}
