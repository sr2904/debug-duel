import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, usePresenceRoom, useQuery, useUserLookup } from 'deepspace'
import { Badge } from '@/components/ui'
import { callAction } from '@/lib/duel/api'
import { slotOf } from '@/lib/duel/slots'
import type { Activity } from '@/lib/duel/types'
import { useServerClock } from '@/lib/duel/useServerClock'
import type { DuelData, SubmissionData } from '../../shared/duel-types'
import { ArenaView } from './ArenaView'
import { CopyLinkButton } from './CopyLinkButton'
import { LobbyView } from './LobbyView'
import { PeopleBar, type Person } from './PeopleBar'
import { ResultView } from './ResultView'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * One duel, live. Reads the duel/entries/submissions collections (synced over
 * the records WebSocket), the presence room for who is here, and picks the
 * view for the duel's server-side status: lobby -> running -> finished.
 */
export function DuelRoom({ duelId }: { duelId: string }) {
  const { userId } = useAuth()
  const { getName, getUser } = useUserLookup()
  const duels = useQuery<DuelData>('duels')
  const submissions = useQuery<SubmissionData>('submissions', { where: { duelId } })
  const clock = useServerClock()
  const presence = usePresenceRoom(`duel:${duelId}`)
  const [myActivity, setMyActivity] = useState<Activity>('idle')

  const duel = duels.records.find((r) => r.recordId === duelId)?.data
  const me = userId ?? ''
  const isHost = !!duel && duel.hostId === me
  const isPlayer = !!duel && (duel.p1Id === me || duel.p2Id === me)

  const nameOf = (id: string) => getName(id) ?? 'Player'

  // Tell the room what I'm doing. `updateState` merges, so role and activity are independent.
  const updateState = useRef(presence.updateState)
  updateState.current = presence.updateState
  useEffect(() => {
    if (presence.connected) updateState.current({ activity: myActivity })
  }, [myActivity, presence.connected])

  const activityOf = (id: string): Activity => {
    if (id === me) return myActivity
    const state = presence.peers.find((p) => p.userId === id)?.state.activity
    return state === 'typing' || state === 'testing' ? state : 'idle'
  }

  const people: Person[] = useMemo(() => {
    const roleOf = (id: string): Person['role'] =>
      duel && (duel.p1Id === id || duel.p2Id === id) ? 'player' : duel?.hostId === id ? 'host' : 'spectator'
    const slotFor = (id: string) => (duel ? slotOf(duel, id) : null)
    const others: Person[] = presence.peers.map((p) => ({
      userId: p.userId, name: p.userName || 'Guest', role: roleOf(p.userId), slot: slotFor(p.userId), imageUrl: getUser(p.userId)?.imageUrl, isYou: false,
    }))
    const self: Person = { userId: me, name: getName(me) ?? 'You', role: roleOf(me), slot: slotFor(me), imageUrl: getUser(me)?.imageUrl, isYou: true }
    return [self, ...others]
  }, [presence.peers, duel, me, getName, getUser])

  // Anyone who is not a player asks the server for spectator access to the live editors.
  // The server refuses players, so this can never give a player their opponent's code.
  // The live editors are only shown once this has settled (see ArenaView), so a spectator who
  // arrives mid-round subscribes AFTER being registered and receives both editors.
  const watchedDuel = useRef<string | null>(null)
  const [accessReady, setAccessReady] = useState(false)
  useEffect(() => {
    if (!duel || !me) return
    if (isPlayer || duel.status === 'finished') {
      setAccessReady(true)
      return
    }
    if (watchedDuel.current === duelId) return
    watchedDuel.current = duelId
    void callAction('watchDuel', { duelId }).finally(() => setAccessReady(true))
  }, [duel, me, isPlayer, duelId])

  // When the deadline passes, whoever notices first asks the server to close the round.
  // The server re-checks its own clock, so a client with a wrong clock can't end it early.
  const closing = useRef(false)
  useEffect(() => {
    if (duel?.status !== 'running' || !duel.endsAt || !clock.synced) return
    const endsAt = duel.endsAt
    const timer = setInterval(async () => {
      if (closing.current || clock.now() < endsAt) return
      closing.current = true
      await sleep(Math.random() * 1000)
      await callAction('finishRound', { duelId })
      closing.current = false
    }, 500)
    return () => clearInterval(timer)
  }, [duel?.status, duel?.endsAt, clock, duelId])

  // Whoever opens a finished duel with pending commentary asks for it (host first, others after a
  // pause). The server only generates it once, so extra calls are harmless.
  const askedForCommentary = useRef(false)
  useEffect(() => {
    if (duel?.status !== 'finished' || duel.commentaryStatus !== 'pending' || askedForCommentary.current) return
    askedForCommentary.current = true
    const timer = setTimeout(() => void callAction('generateCommentary', { duelId }), isHost ? 0 : 3000 + Math.random() * 3000)
    return () => clearTimeout(timer)
  }, [duel?.status, duel?.commentaryStatus, isHost, duelId])

  if (duels.status === 'loading') {
    return <p className="p-8 text-center text-muted-foreground">Loading duel…</p>
  }
  if (!duel) {
    return (
      <div className="p-8 text-center" data-testid="duel-not-found">
        <p className="text-muted-foreground">We could not find this duel.</p>
        <Link to="/home" className="mt-2 inline-block text-sm underline">Back to all duels</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:p-6" data-testid="duel-room" data-status={duel.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isHost && <Badge variant="warning" data-testid="role-host">Host</Badge>}
          <Badge variant={isPlayer ? 'info' : 'secondary'} className="font-mono uppercase tracking-wider" data-testid="role-badge">{isPlayer ? 'Player' : 'Spectator'}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {duel.status !== 'lobby' && <CopyLinkButton url={`${window.location.origin}/duel/${duelId}`} testId="copy-invite-btn" />}
          <PeopleBar people={people} playerCount={[duel.p1Id, duel.p2Id].filter(Boolean).length} />
        </div>
      </div>

      <div>
        {duel.status === 'lobby' && <LobbyView duelId={duelId} duel={duel} userId={me} isHost={isHost} nameOf={nameOf} />}
        {duel.status === 'running' && !accessReady && (
          <p className="p-8 text-center text-muted-foreground" data-testid="joining">Joining the duel…</p>
        )}
        {duel.status === 'running' && accessReady && (
          <ArenaView
            duelId={duelId}
            duel={duel}
            submissions={submissions.records}
            userId={me}
            isHost={isHost}
            nameOf={nameOf}
            activityOf={activityOf}
            setMyActivity={setMyActivity}
            now={clock.now}
          />
        )}
        {duel.status === 'finished' && (
          <ResultView duel={duel} submissions={submissions.records} nameOf={nameOf} now={clock.now} />
        )}
      </div>
    </div>
  )
}
