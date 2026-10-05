import { useState } from 'react'
import { Button, useToast } from '@/components/ui'
import { callAction } from '@/lib/duel/api'
import { CopyLinkButton } from './CopyLinkButton'
import { SLOT_STYLE, type Slot } from '@/lib/duel/slots'
import { cn } from '@/lib/utils'
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
  const { error: showError } = useToast()
  const [busy, setBusy] = useState<'join' | 'start' | null>(null)
  const link = `${window.location.origin}/duel/${duelId}`
  const isPlayer = duel.p1Id === userId || duel.p2Id === userId
  const slotsFull = !!duel.p1Id && !!duel.p2Id
  const minutes = Math.round(duel.durationSec / 60)

  async function act(kind: 'join' | 'start') {
    setBusy(kind)
    const res = await callAction(kind === 'join' ? 'joinDuel' : 'startRound', { duelId })
    if (!res.success) showError(kind === 'join' ? 'Could not join' : 'Could not start', res.error)
    setBusy(null)
  }

  const slotCard = (slot: Slot, id: string | undefined) => {
    const style = SLOT_STYLE[slot]
    return (
      <div className={cn('min-h-28 rounded-lg border-2 bg-card p-5', style.border, id && style.glow)} data-testid="player-slot">
        <p className={cn('font-mono text-[10px] uppercase tracking-[0.3em]', style.text)}>{style.label}</p>
        <p className={cn('mt-2 truncate font-mono text-2xl font-black uppercase', id ? style.text : 'text-muted-foreground/60')}>
          {id ? nameOf(id) : 'Waiting…'}
        </p>
        {id === userId && <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">That&apos;s you</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-testid="lobby">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Lobby</p>
        <h1 className="mt-1 font-mono text-3xl font-black tracking-tight" data-testid="duel-title">{duel.title}</h1>
        <p className="mt-2 text-muted-foreground">
          Two players race to fix the same buggy function in {minutes} {minutes === 1 ? 'minute' : 'minutes'}. Everyone else watches live as a spectator.
        </p>
      </div>

      <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {slotCard(1, duel.p1Id)}
        <span className="self-center text-center font-mono text-2xl font-black" aria-hidden>
          <span className="text-p1">V</span>
          <span className="text-p2">S</span>
        </span>
        {slotCard(2, duel.p2Id)}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Invite link</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-background px-3 py-2 font-mono text-xs" data-testid="duel-link">{link}</code>
          <CopyLinkButton url={link} testId="copy-invite-btn" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!isPlayer && !slotsFull && (
          <Button size="lg" onClick={() => act('join')} loading={busy === 'join'} data-testid="join-player-btn">
            Join as a player
          </Button>
        )}
        {!isPlayer && slotsFull && (
          <p className="text-sm text-muted-foreground" data-testid="spectator-note">
            Both player slots are taken. You will watch this duel as a spectator.
          </p>
        )}
        {isHost && (
          <Button size="lg" onClick={() => act('start')} loading={busy === 'start'} disabled={!slotsFull} data-testid="start-round-btn">
            Start the round
          </Button>
        )}
        {isHost && !slotsFull && <p className="text-sm text-muted-foreground">Waiting for two players to join.</p>}
        {!isHost && slotsFull && <p className="text-sm text-muted-foreground">Waiting for the host to start the round…</p>}
      </div>
    </div>
  )
}
