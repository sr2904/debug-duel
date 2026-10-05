import { useCallback, useEffect, useRef, useState } from 'react'
import { callAction } from './api'

const RESYNC_MS = 60_000

/**
 * A clock that tracks the server's, not the device's.
 *
 * Round start/end times are written by the worker (Date.now() there). Each
 * browser measures its own offset from that clock so every screen shows the
 * same countdown even if a laptop's clock is wrong.
 */
export function useServerClock() {
  const offsetMs = useRef(0)
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function sync() {
      const before = Date.now()
      const res = await callAction<{ now: number }>('serverTime')
      const after = Date.now()
      if (cancelled || !res.success) return
      // Assume the reply took half the round trip to get here.
      offsetMs.current = res.data.now - (before + after) / 2
      setSynced(true)
    }
    void sync()
    const timer = setInterval(sync, RESYNC_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const now = useCallback(() => Date.now() + offsetMs.current, [])
  return { now, synced }
}
