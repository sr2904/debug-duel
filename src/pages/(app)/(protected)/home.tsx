import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutations, useQuery, useUserLookup, type RecordData } from 'deepspace'
import { Button, Input, useToast } from '@/components/ui'
import { SLOT_STYLE } from '@/lib/duel/slots'
import { cn } from '@/lib/utils'
import { isTestDuel } from '../../../shared/duel-rules'
import type { DuelData } from '../../../shared/duel-types'

const DURATIONS = [
  { sec: 60, label: '1 minute' },
  { sec: 180, label: '3 minutes' },
  { sec: 300, label: '5 minutes' },
  { sec: 600, label: '10 minutes' },
]

/** The lobby: create a duel (you become its host) or jump into an existing one. */
export default function HomePage() {
  const navigate = useNavigate()
  const { error: showError } = useToast()
  const { getName } = useUserLookup()
  const { records: allDuels, status } = useQuery<DuelData>('duels', { orderBy: 'createdAt', orderDir: 'desc', limit: 100 })
  // Playwright's duels are titled `__test-...`; keep them out of the list people see.
  const records = allDuels.filter((r) => !isTestDuel(r.data.title)).slice(0, 30)
  // The duels schema only lets a client supply `title` and `durationSec`; the server stamps the host.
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
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:py-16">
      <section className="space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary">Live 1v1 debugging</p>
        <h1 className="max-w-3xl font-mono text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          Two devs. One bug.
          <br />
          <span className="text-primary">First to green wins.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Share a link, race a friend to fix the same broken function, and let everyone else watch both editors live.
        </p>

        <form
          className="flex max-w-2xl flex-col gap-2 sm:flex-row"
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
            className="h-12 font-mono"
            data-testid="duel-title-input"
          />
          <select
            value={durationSec}
            onChange={(e) => setDurationSec(Number(e.target.value))}
            aria-label="Round length"
            data-testid="duel-duration-select"
            className="h-12 rounded-md border border-input bg-background px-3 font-mono text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d.sec} value={d.sec}>{d.label}</option>
            ))}
          </select>
          <Button type="submit" size="lg" className="h-12 px-8 font-mono uppercase tracking-wider" loading={creating} disabled={!ready} data-testid="create-duel-btn">
            Create duel
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Recent duels</h2>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-testid="no-duels">
            No duels yet. Create the first one.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="duel-list">
            {records.map((r) => (
              <li key={r.recordId}>
                <DuelCard record={r} nameOf={(id) => getName(id) ?? 'Player'} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

const STATUS_LABEL = { lobby: 'Lobby', running: 'Live', finished: 'Finished' } as const

/** A compact duel card: "Alice vs Bob", its status, and the winner once it is over. */
function DuelCard({ record, nameOf }: { record: RecordData<DuelData>; nameOf: (id: string) => string }) {
  const d = record.data
  const side = (slot: 1 | 2, id?: string) => (
    <span className={cn('truncate', id ? SLOT_STYLE[slot].text : 'text-muted-foreground/60')}>{id ? nameOf(id) : 'open slot'}</span>
  )
  return (
    <Link
      to={`/duel/${record.recordId}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-accent"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{d.title}</span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest',
            d.status === 'running' ? 'text-destructive' : d.status === 'lobby' ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {d.status === 'running' && <span className="size-1.5 animate-pulse rounded-full bg-destructive" />}
          {STATUS_LABEL[d.status]}
        </span>
      </div>
      <p className="mt-3 flex items-baseline gap-2 font-mono text-xl font-black uppercase">
        {side(1, d.p1Id)}
        <span className="text-xs font-bold text-muted-foreground">vs</span>
        {side(2, d.p2Id)}
      </p>
      <p className="mt-3 font-mono text-xs text-muted-foreground">
        {d.status === 'finished'
          ? d.winnerId
            ? <>Winner: <span className={cn('font-bold', d.winnerId === d.p1Id ? SLOT_STYLE[1].text : SLOT_STYLE[2].text)}>{nameOf(d.winnerId)}</span></>
            : 'Draw'
          : `Hosted by ${nameOf(d.hostId)}`}
      </p>
    </Link>
  )
}
