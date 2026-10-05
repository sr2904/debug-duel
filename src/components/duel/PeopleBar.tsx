import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'
import { SLOT_STYLE, type Slot } from '@/lib/duel/slots'
import { cn } from '@/lib/utils'

export interface Person {
  userId: string
  name: string
  role: 'host' | 'player' | 'spectator'
  slot: Slot | null
  imageUrl?: string
  isYou: boolean
}

const MAX_AVATARS = 8

/** Who is in the room right now (from the presence room): a spectator count plus avatars. */
export function PeopleBar({ people, playerCount }: { people: Person[]; playerCount: number }) {
  // "Watching" = everyone here who is not one of the two players (spectators, and the host if they are not playing).
  const watching = people.filter((p) => p.role !== 'player').length
  const shown = people.slice(0, MAX_AVATARS)
  const hidden = people.length - shown.length
  return (
    <div className="flex items-center gap-3" data-testid="people-bar">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground" data-testid="spectator-count">
        {playerCount} {playerCount === 1 ? 'player' : 'players'} · {watching} watching
      </span>
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <Avatar
            key={p.userId}
            data-testid="person"
            title={`${p.name}${p.isYou ? ' (you)' : ''} · ${p.role}`}
            className={cn('size-7 ring-2 ring-background', p.slot ? cn('ring-2', SLOT_STYLE[p.slot].ring) : p.role === 'host' ? 'ring-primary' : '')}
          >
            {p.imageUrl && <AvatarImage src={p.imageUrl} alt="" />}
            <AvatarFallback className="bg-secondary font-mono text-[10px] font-bold uppercase">{p.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
        ))}
        {hidden > 0 && (
          <span className="z-10 flex size-7 items-center justify-center rounded-full bg-secondary font-mono text-[10px] ring-2 ring-background">+{hidden}</span>
        )}
      </div>
    </div>
  )
}
