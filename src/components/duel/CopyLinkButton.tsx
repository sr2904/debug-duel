import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, useToast } from '@/components/ui'

const CONFIRM_MS = 2000

/** Older or locked-down browsers: copy through a temporary textarea. */
function legacyCopy(text: string): boolean {
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(el)
  }
}

/** "Copy invite link", which turns into "Copied!" for two seconds. */
export function CopyLinkButton({ url, testId = 'copy-invite-btn' }: { url: string; testId?: string }) {
  const { error: showError } = useToast()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    let ok = false
    try {
      await navigator.clipboard.writeText(url)
      ok = true
    } catch {
      ok = legacyCopy(url)
    }
    if (!ok) return showError('Copy failed', 'Select the link and copy it manually.')
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), CONFIRM_MS)
  }

  return (
    <Button variant="outline" size="sm" onClick={copy} data-testid={testId} aria-live="polite">
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied!' : 'Copy invite link'}
    </Button>
  )
}
