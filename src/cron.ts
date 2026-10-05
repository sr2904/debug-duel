/**
 * Scheduled tasks, run by the app's CronRoom Durable Object (wired in worker.ts).
 *
 * `expire-duels` is what makes round completion server-authoritative: every
 * minute it closes any running duel whose deadline has passed, whether or not
 * a single browser is still connected. (Clients also ask the server to finish
 * a round the instant the countdown ends, so normally the sweep finds nothing.)
 */

import { buildCronContext } from 'deepspace/worker'
import type { CronTask } from 'deepspace/worker'
import type { Env } from '../worker'
import { cronStore, finishExpiredDuels } from './server/duel-finish'

export const tasks: CronTask[] = [{ name: 'expire-duels', intervalMinutes: 1 }]

export async function runTask(name: string, env: Env): Promise<void> {
  if (name !== 'expire-duels') return
  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.DEEPSPACE_APP_ID}`)
  const closed = await finishExpiredDuels(cronStore(ctx.records))
  if (closed.length > 0) console.info(`[expire-duels] closed ${closed.length} expired duel(s)`)
}
