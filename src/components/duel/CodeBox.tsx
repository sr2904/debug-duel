import type { KeyboardEvent } from 'react'
import { SLOT_STYLE, type Slot } from '@/lib/duel/slots'
import { cn } from '@/lib/utils'

interface CodeBoxProps {
  value: string
  onChange?: (code: string) => void
  readOnly?: boolean
  testId: string
  /** Whose editor this is; tints the focus ring in their color. */
  slot: Slot
  className?: string
}

/** A plain monospace textarea. Read-only boxes show another player's live code. */
export function CodeBox({ value, onChange, readOnly = false, testId, slot, className }: CodeBoxProps) {
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
      aria-label={readOnly ? 'Read-only code editor' : 'Your code editor'}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        'h-72 w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-[13px] leading-relaxed text-foreground outline-none sm:h-80 lg:h-[26rem]',
        readOnly ? 'cursor-default text-foreground/85' : cn('focus-visible:ring-2', SLOT_STYLE[slot].focus),
        className,
      )}
    />
  )
}
