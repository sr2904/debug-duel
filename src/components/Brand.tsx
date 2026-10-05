import { cn } from '@/lib/utils'

/** The product mark. One component so it reads "DEBUG/DUEL" everywhere, signed in or out. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('font-mono font-bold tracking-widest', className)}>
      DEBUG<span className="text-primary">/</span>DUEL
    </span>
  )
}
