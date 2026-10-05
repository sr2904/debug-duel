import { Badge } from '@/components/ui'

export interface Person {
  userId: string
  name: string
  role: 'host' | 'player' | 'spectator'
  isYou: boolean
}

/** Who is in the room right now (from the presence room). */
export function PeopleBar({ people }: { people: Person[] }) {
  const spectators = people.filter((p) => p.role === 'spectator').length
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="people-bar">
      <span className="text-muted-foreground" data-testid="spectator-count">
        {spectators} {spectators === 1 ? 'spectator' : 'spectators'}
      </span>
      {people.map((p) => (
        <Badge key={p.userId} variant={p.role === 'player' ? 'info' : 'secondary'} data-testid="person">
          {p.name}
          {p.isYou ? ' (you)' : ''} · {p.role}
        </Badge>
      ))}
    </div>
  )
}
