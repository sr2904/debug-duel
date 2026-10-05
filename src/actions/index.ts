import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { duelActions } from './duel-actions'

export const actions: Record<string, ActionHandler<Env>> = {
  ...duelActions,
}
