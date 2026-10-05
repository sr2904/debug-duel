/**
 * Collections for Debug Duel.
 *
 * Who can write what is enforced here, in the Durable Object, not in the UI:
 *  - duels: any signed-in user can create one (title and round length only). After that the row
 *    changes only through server actions (join, start, finish, commentary).
 *  - entries: a player's live code. Created by the joinDuel action; only its
 *    owner can edit it, and only the `code` column.
 *  - submissions: test scores (public). solutions: the code behind them (unreadable by clients).
 *    Both are written only by the submitResult action.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const duelsSchema: CollectionSchema = {
  name: 'duels',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    // userBound: the server stamps the creator's id, so nobody can host "as" someone else.
    { name: 'hostId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['lobby', 'running', 'finished'] }, default: 'lobby' },
    { name: 'p1Id', storage: 'text', interpretation: 'plain' },
    { name: 'p2Id', storage: 'text', interpretation: 'plain' },
    { name: 'durationSec', storage: 'number', interpretation: 'plain', default: 300 },
    { name: 'puzzleId', storage: 'text', interpretation: 'plain' },
    { name: 'puzzleTitle', storage: 'text', interpretation: 'plain' },
    { name: 'puzzleDescription', storage: 'text', interpretation: 'plain' },
    { name: 'buggyCode', storage: 'text', interpretation: 'plain' },
    { name: 'testCount', storage: 'number', interpretation: 'plain' },
    { name: 'startedAt', storage: 'number', interpretation: 'plain' },
    { name: 'endsAt', storage: 'number', interpretation: 'plain' },
    { name: 'finishedAt', storage: 'number', interpretation: 'plain' },
    { name: 'winnerId', storage: 'text', interpretation: 'plain' },
    { name: 'endReason', storage: 'text', interpretation: { kind: 'select', options: ['solved', 'timeout', 'host_ended'] } },
    { name: 'commentaryStatus', storage: 'text', interpretation: { kind: 'select', options: ['none', 'pending', 'running', 'done', 'failed'] }, default: 'none' },
    { name: 'commentary', storage: 'text', interpretation: 'plain' },
    { name: 'p1Code', storage: 'text', interpretation: 'plain' },
    { name: 'p2Code', storage: 'text', interpretation: 'plain' },
  ],
  ownerField: 'hostId',
  permissions: {
    // writableFields: a client may only supply `title` and `durationSec` when creating a duel.
    // startRound clamps the duration, so a silly value can't produce an endless round.
    member: { read: true, create: true, update: false, delete: false, writableFields: ['title', 'durationSec'] },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

export const entriesSchema: CollectionSchema = {
  name: 'entries',
  columns: [
    { name: 'duelId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'code', storage: 'text', interpretation: 'plain', default: '' },
  ],
  uniqueOn: ['duelId', 'userId'],
  ownerField: 'userId',
  // The duel is the "team": a row is readable by its owner, or by anyone listed in
  // team_members for that duel (spectators, registered by the watchDuel action).
  // The Durable Object filters rows BEFORE sending, so an opponent never receives your code.
  teamField: 'duelId',
  permissions: {
    member: { read: 'team', create: false, update: 'own', delete: false, writableFields: ['code'] },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/**
 * Who may watch a duel's live editors. One row per spectator (recordId `${duelId}:${userId}`),
 * written only by watchDuel and removed by joinDuel if that person takes a player slot.
 * Clients can neither read nor write it.
 */
export const teamMembersSchema: CollectionSchema = {
  name: 'team_members',
  columns: [
    { name: 'teamId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'status', storage: 'text', interpretation: 'plain', default: 'active' },
  ],
  uniqueOn: ['teamId', 'userId'],
  permissions: {
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

export const submissionsSchema: CollectionSchema = {
  name: 'submissions',
  columns: [
    { name: 'duelId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'passed', storage: 'number', interpretation: 'plain', required: true },
    { name: 'total', storage: 'number', interpretation: 'plain', required: true },
    { name: 'at', storage: 'number', interpretation: 'plain', required: true },
  ],
  permissions: {
    // Scores are public (spectators and the opponent see "X of Y passing"). Code is NOT here: see solutions.
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/** The code behind each submission. No client can read it: the server reveals it at round end. */
export const solutionsSchema: CollectionSchema = {
  name: 'solutions',
  columns: [
    { name: 'duelId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'passed', storage: 'number', interpretation: 'plain', required: true },
    { name: 'total', storage: 'number', interpretation: 'plain', required: true },
    { name: 'code', storage: 'text', interpretation: 'plain' },
    { name: 'at', storage: 'number', interpretation: 'plain', required: true },
  ],
  permissions: {
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
