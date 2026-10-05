import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutations, useQuery, useUserLookup } from 'deepspace'
import { Badge, Button, Input, useToast } from '@/components/ui'
import type { DuelData } from '../../../shared/duel-types'

const DURATIONS = [
  { sec: 60, label: '1 minute' },
  { sec: 180, label: '3 minutes' },
  { sec: 300, label: '5 minutes' },
  { sec: 600, label: '10 minutes' },
]

const STATUS_BADGE = { lobby: 'info', running: 'warning', finished: 'secondary' } as const

/** The lobby: create a duel (you become its host) or open an existing one. */
export default function HomePage() {
  const navigate = useNavigate()
  const { error: showError } = useToast()
  const { getName } = useUserLookup()
  const { records, status } = useQuery<DuelData>('duels', { orderBy: 'createdAt', orderDir: 'desc', limit: 30 })
  // The duels schema only lets a client supply `title`; the server stamps the host.
  const { createConfirmed, ready } = useMutations<Pick<DuelData, 'title' | 'durationSec'>>('duels')
  const [title, setTitle] = useState('')
  const [durationSec, setDurationSec] = useState(300)
  const [creating, setCreating] = useState(false)

  async function createDuel() {
    setCreating(true)
    try {
      const id = await createConfirmed({ title: title.trim() || 'Debug Duel', durationSec })
      navigate(`/duel/${id}`)
    } catch (err) {
      showError('Could not create the duel', err instanceof Error ? err.message : undefined)
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Debug Duel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a duel, share the link, and race a friend to fix the same buggy function. Everyone else spectates live.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void createDuel()
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name your duel (optional)"
          maxLength={60}
          data-testid="duel-title-input"
        />
        <select
          value={durationSec}
          onChange={(e) => setDurationSec(Number(e.target.value))}
          aria-label="Round length"
          data-testid="duel-duration-select"
          className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
        >
          {DURATIONS.map((d) => (
            <option key={d.sec} value={d.sec}>{d.label}</option>
          ))}
        </select>
        <Button type="submit" loading={creating} disabled={!ready} data-testid="create-duel-btn">
          Create duel
        </Button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent duels</h2>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="no-duels">No duels yet. Create the first one.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card" data-testid="duel-list">
            {records.map((r) => (
              <li key={r.recordId}>
                <Link to={`/duel/${r.recordId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.data.title}</span>
                    <span className="text-xs text-muted-foreground">Hosted by {getName(r.data.hostId) ?? 'someone'}</span>
                  </span>
                  <Badge variant={STATUS_BADGE[r.data.status]}>{r.data.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
