import { useParams } from 'react-router-dom'
import { DuelRoom } from '@/components/duel/DuelRoom'

/** /duel/:id is the shareable link. Sign-in is required (the parent layout gates it). */
export default function DuelPage() {
  const { id } = useParams()
  if (!id) return null
  return <DuelRoom duelId={id} />
}
