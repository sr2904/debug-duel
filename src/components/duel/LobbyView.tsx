import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Badge, Button, useToast } from '@/components/ui'
import { callAction } from '@/lib/duel/api'
import type { DuelData } from '../../shared/duel-types'

interface LobbyViewProps {
  duelId: string
  duel: DuelData
  userId: string
  isHost: boolean
  nameOf: (userId: string) => string
}

/** Before the round: share the link, claim a player slot, and (host) start. */
export function LobbyView({ duelId, duel, userId, isHost, nameOf }: LobbyViewProps) {
  const { error: showError, success } = useToast()
  const [busy, setBusy] = useState<'join' | 'start' | null>(null)
  const link = `${window.location.origin}/duel/${duelId}`
  const isPlayer = duel.p1Id === userId || duel.p2Id === userId
  const slotsFull = !!duel.p1Id && !!duel.p2Id

  async function act(kind: 'join' | 'start') {
    setBusy(kind)
    const res = await callAction(kind === 'join' ? 'joinDuel' : 'startRound', { duelId })
    if (!res.success) showError(kind === 'join' ? 'Could not join' : 'Could not start', res.error)
    setBusy(null)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      success('Link copied')
    } catch {
      showError('Copy failed', 'Select the link and copy it manually.')
    }
  }

  const slots = [
    { label: 'Player 1', id: duel.p1Id },
    { label: 'Player 2', id: duel.p2Id },
  ]

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6" data-testid="lobby">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="duel-title">{duel.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Two players race to fix the same buggy function in {Math.round(duel.durationSec / 60)} {duel.durationSec === 60 ? 'minute' : 'minutes'}. Everyone else watches live as a spectator.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Share this link</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-2 text-xs" data-testid="duel-link">{link}</code>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy /> Copy
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((slot) => (
          <div key={slot.label} className="rounded-lg border border-border bg-card p-4" data-testid="player-slot">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{slot.label}</p>
            <p className="mt-1 font-medium">
              {slot.id ? nameOf(slot.id) : <span className="text-muted-foreground">Waiting for a player…</span>}
            </p>
            {slot.id === userId && <Badge className="mt-2" variant="outline">You</Badge>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!isPlayer && !slotsFull && (
          <Button onClick={() => act('join')} loading={busy === 'join'} data-testid="join-player-btn">
            Join as a player
          </Button>
        )}
        {!isPlayer && slotsFull && (
          <p className="text-sm text-muted-foreground" data-testid="spectator-note">
            Both player slots are taken. You will watch this duel as a spectator.
          </p>
        )}
        {isHost && (
          <Button
            onClick={() => act('start')}
            loading={busy === 'start'}
            disabled={!slotsFull}
            data-testid="start-round-btn"
          >
            Start the round
          </Button>
        )}
        {isHost && !slotsFull && <p className="text-sm text-muted-foreground">Waiting for two players to join.</p>}
        {!isHost && slotsFull && <p className="text-sm text-muted-foreground">Waiting for the host to start the round…</p>}
      </div>
    </div>
  )
}
