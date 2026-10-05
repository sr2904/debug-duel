/**
 * Debug Duel core path, driven by four real signed-in browsers:
 * host creates a duel, two players join, a spectator watches, the round runs,
 * and the winner screen appears for everyone.
 *
 * Needs four test accounts named Host, Alice, Bob, Viewer:
 *   npx deepspace test accounts list --usable
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { seedPuzzles } from '../src/server/puzzles/seed-puzzles'

const APP_ID = /DEEPSPACE_APP_ID = "([^"]+)"/.exec(readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8'))![1]

const NAMES = ['Host', 'Alice', 'Bob', 'Viewer']
const haveAccounts = NAMES.every((n) => loadAllTestAccounts().some((a) => a.name === n))
test.skip(!haveAccounts, `Needs test accounts named ${NAMES.join(', ')} (see header comment).`)

/** The same bearer token the app's own client uses for server actions. */
async function tokenFor(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    return ((await res.json()) as { token: string }).token
  })
}

/** Call a server action as the user who owns this page. */
async function action(page: Page, name: string, params: Record<string, unknown>) {
  const token = await tokenFor(page)
  return page.evaluate(
    async ({ name, params, token }) => {
      const res = await fetch(`/api/actions/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      })
      return (await res.json()) as { success?: boolean; error?: string; data?: unknown }
    },
    { name, params, token },
  )
}

async function createDuelAsHost(page: Page, durationSec = 300): Promise<string> {
  await page.goto('/home')
  await page.getByTestId('duel-duration-select').selectOption(String(durationSec))
  await page.getByTestId('duel-title-input').fill(`__test-${Date.now()}__ duel`)
  await expect(page.getByTestId('create-duel-btn')).toBeEnabled({ timeout: 20_000 })
  await page.getByTestId('create-duel-btn').click()
  await page.waitForURL(/\/duel\/[^/]+$/)
  return page.url()
}

test('full duel: host + two players + spectator, winner shown to everyone', async ({ users }) => {
  test.setTimeout(180_000)
  const [host, alice, bob, viewer] = await users(NAMES)
  const everyone = [host, alice, bob, viewer]

  // 1. The host creates a duel and gets a shareable link.
  const link = await createDuelAsHost(host.page)
  // Test data stays out of the lobby list: the duel exists, but its `__test-` title is hidden.
  await host.page.goto('/home')
  await expect(host.page.getByTestId('duel-list').or(host.page.getByTestId('no-duels'))).toBeVisible({ timeout: 20_000 })
  await expect(host.page.getByText('__test-')).toHaveCount(0)
  await host.page.goto(link)
  await expect(host.page.getByTestId('duel-link')).toHaveText(link)
  await expect(host.page.getByTestId('role-host')).toBeVisible()

  // 2. Everyone opens the link. Nobody has a slot yet, so everyone is a spectator.
  for (const u of [alice, bob, viewer]) await u.page.goto(link)
  for (const u of everyone) await expect(u.page.getByTestId('duel-room')).toBeVisible({ timeout: 20_000 })
  await expect(viewer.page.getByTestId('role-badge')).toHaveText('Spectator')

  // Presence: the spectator sees all four people in the room.
  await expect(viewer.page.getByTestId('person')).toHaveCount(4, { timeout: 20_000 })

  // 3. Two people claim the player slots; the rest stay spectators.
  await expect(alice.page.getByTestId('join-player-btn')).toBeEnabled()
  await alice.page.getByTestId('join-player-btn').click()
  await expect(alice.page.getByTestId('role-badge')).toHaveText('Player')
  await bob.page.getByTestId('join-player-btn').click()
  await expect(bob.page.getByTestId('role-badge')).toHaveText('Player')
  await expect(viewer.page.getByTestId('spectator-note')).toBeVisible()
  await expect(viewer.page.getByTestId('join-player-btn')).toHaveCount(0)

  // The header counts players and people watching clearly.
  await expect(viewer.page.getByTestId('spectator-count')).toHaveText(/2 players · \d+ watching/)

  // 4. The host starts the round. Everyone flips to the arena at once, same puzzle.
  await expect(host.page.getByTestId('start-round-btn')).toBeEnabled()
  await host.page.getByTestId('start-round-btn').click()
  for (const u of everyone) {
    await expect(u.page.getByTestId('duel-room')).toHaveAttribute('data-status', 'running', { timeout: 20_000 })
    await expect(u.page.getByTestId('countdown')).toBeVisible()
  }
  const puzzleTitle = (await alice.page.getByTestId('puzzle-title').textContent()) ?? ''
  for (const u of [bob, viewer, host]) await expect(u.page.getByTestId('puzzle-title')).toHaveText(puzzleTitle)
  const puzzle = seedPuzzles.find((p) => p.title === puzzleTitle)!
  expect(puzzle, 'puzzle shown in the room is one of the seeds').toBeTruthy()

  // "Copy invite link" confirms with "Copied!" and then goes back to its label.
  await host.context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const copyBtn = host.page.getByTestId('copy-invite-btn')
  await expect(copyBtn).toHaveText('Copy invite link')
  await copyBtn.click()
  await expect(copyBtn).toHaveText('Copied!')
  expect(await host.page.evaluate(() => navigator.clipboard.readText())).toBe(link)
  await expect(copyBtn).toHaveText('Copy invite link', { timeout: 5_000 })

  // The countdown is shared: all four screens read within a couple of seconds of each other.
  const seconds = await Promise.all(
    everyone.map(async (u) => {
      const [m, s] = ((await u.page.getByTestId('countdown').textContent()) ?? '0:00').split(':').map(Number)
      return m * 60 + s
    }),
  )
  expect(Math.max(...seconds) - Math.min(...seconds)).toBeLessThanOrEqual(2)

  // Both players start with the buggy code. Spectators see both editors.
  await expect(alice.page.getByTestId('my-editor')).toHaveValue(puzzle.buggyCode)
  await expect(viewer.page.getByTestId('watch-editor')).toHaveCount(2)

  // 5. Bob runs the unfixed code: he sees a partial score, and the spectator sees his status live.
  await bob.page.getByTestId('run-tests-btn').click()
  await expect(bob.page.getByTestId('test-summary')).toContainText(`of ${puzzle.tests.length} tests passed`, { timeout: 20_000 })
  const bobSummary = (await bob.page.getByTestId('test-summary').textContent()) ?? ''
  expect(bobSummary).not.toContain(`${puzzle.tests.length} of ${puzzle.tests.length}`)
  await expect(host.page.getByTestId('player-score').first()).toBeVisible()

  // Alice also runs her unfixed code first, so she ends up with two recorded runs (partial, then perfect).
  // The commentary must describe her winning run, not her first one.
  await alice.page.getByTestId('run-tests-btn').click()
  await expect(alice.page.getByTestId('test-summary')).toBeVisible({ timeout: 20_000 })

  // 6. Alice edits; the spectator and Bob watch her code change live.
  const marker = `// alice was here ${Date.now()}\n`
  await alice.page.getByTestId('my-editor').fill(marker + puzzle.referenceFix)
  await expect(viewer.page.locator('[data-testid="watch-editor"]').first()).toBeVisible()
  await expect
    .poll(async () => (await viewer.page.getByTestId('watch-editor').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))).some((v) => v.includes('alice was here')), { timeout: 15_000 })
    .toBe(true)

  // Bob is her opponent, so he must NOT see her code: a locked panel, but her name, status and score stay visible.
  const lockedForBob = bob.page.getByTestId('locked-panel')
  await expect(lockedForBob).toBeVisible()
  await expect(lockedForBob).toContainText('Code hidden until the round ends')
  await expect(bob.page.getByTestId('watch-editor')).toHaveCount(0)
  const aliceColumnForBob = bob.page.getByTestId('player-column')
  await expect(aliceColumnForBob.getByTestId('player-name')).toHaveText('Alice')
  await expect(aliceColumnForBob.getByTestId('player-score')).toContainText(`of ${puzzle.tests.length} passing`)

  // 7. Alice runs her fix. The server records it and ends the round: winner screen for everyone.
  await alice.page.getByTestId('run-tests-btn').click()
  for (const u of everyone) {
    await expect(u.page.getByTestId('winner-screen')).toBeVisible({ timeout: 30_000 })
    await expect(u.page.getByTestId('winner-name')).toContainText('Alice')
    await expect(u.page.getByTestId('win-reason')).toContainText('passed every hidden test first')
  }

  // The round is over: now both players' code is revealed on the winner screen, to everyone.
  for (const u of everyone) {
    await expect(u.page.getByTestId('reveal-code-p1')).toHaveValue(new RegExp('alice was here'))
    await expect(u.page.getByTestId('reveal-code-p2')).toHaveValue(puzzle.buggyCode)
  }

  // 8. Commentary appears for everyone, or the result stands without it if the AI call fails.
  for (const u of everyone) {
    await expect(u.page.getByTestId('commentary-text').or(u.page.getByTestId('commentary-unavailable'))).toBeVisible({ timeout: 60_000 })
  }
  // Whatever the AI wrote must agree with the record: a winner by solving, never a tie or a tiebreaker.
  const commentary = (await viewer.page.getByTestId('commentary-text').count()) ? await viewer.page.getByTestId('commentary-text').textContent() : ''
  expect(commentary).not.toMatch(/\b(tie|tied|tiebreak\w*|identical)\b/i)
  console.log('commentary shown:', await viewer.page.getByTestId('commentary-text').count() === 1 ? 'AI text' : 'unavailable fallback')
})

test('server enforces roles: only the host starts, only players run tests', async ({ users }) => {
  test.setTimeout(120_000)
  const [host, alice, bob, viewer] = await users(NAMES)
  const link = await createDuelAsHost(host.page)
  const duelId = link.split('/').pop()!
  for (const u of [alice, bob, viewer]) await u.page.goto(link)
  for (const u of [alice, bob, viewer]) await expect(u.page.getByTestId('duel-room')).toBeVisible({ timeout: 20_000 })

  // A non-host cannot start the round, and nobody can start it without two players.
  expect(await action(alice.page, 'startRound', { duelId })).toMatchObject({ success: false, error: 'Only the host can start the round' })
  expect(await action(host.page, 'startRound', { duelId })).toMatchObject({ success: false, error: 'Two players need to join first' })

  expect(await action(alice.page, 'joinDuel', { duelId })).toMatchObject({ success: true })
  expect(await action(bob.page, 'joinDuel', { duelId })).toMatchObject({ success: true })
  // A third person asking for a slot gets turned away: they stay a spectator.
  expect(await action(viewer.page, 'joinDuel', { duelId })).toMatchObject({ success: false, error: 'Both player slots are taken' })

  // Before the round starts there are no tests to fetch and nothing to submit.
  expect(await action(alice.page, 'getTests', { duelId })).toMatchObject({ success: false })

  expect(await action(host.page, 'startRound', { duelId })).toMatchObject({ success: true })

  // Spectators cannot fetch the hidden tests or report a result.
  expect(await action(viewer.page, 'getTests', { duelId })).toMatchObject({ success: false, error: 'Only players can run tests' })
  const total = seedPuzzles.reduce((n, p) => Math.max(n, p.tests.length), 0)
  expect(await action(viewer.page, 'submitResult', { duelId, passed: total, total, code: 'x' })).toMatchObject({ success: false, error: 'Only players can submit results' })

  // A player cannot claim a pass count that doesn't fit the puzzle.
  expect(await action(alice.page, 'submitResult', { duelId, passed: 99, total: 99, code: 'x' })).toMatchObject({ success: false, error: 'Invalid submission' })
  expect(await action(alice.page, 'submitResult', { duelId, passed: -1, total, code: 'x' })).toMatchObject({ success: false })

  // Only the host can end the round early; the winner field cannot be set by a client.
  expect(await action(alice.page, 'finishRound', { duelId })).toMatchObject({ success: false, error: 'Only the host can end the round early' })
  expect(await action(host.page, 'finishRound', { duelId })).toMatchObject({ success: true })
  for (const u of [host, alice, bob, viewer]) {
    await expect(u.page.getByTestId('winner-screen')).toBeVisible({ timeout: 20_000 })
    await expect(u.page.getByTestId('winner-name')).toHaveText('Draw')
  }
})

/**
 * Talk to the records WebSocket directly, the way a hand-written client would,
 * bypassing the app's UI. This is what proves the permission rules live in the
 * Durable Object and not just in which buttons we render.
 */
async function rawSocket(page: Page, frames: object[], until: (m: any) => boolean, ms = 6000) {
  const token = await tokenFor(page)
  return page.evaluate(
    ({ appId, token, frames, untilSrc, ms }) =>
      new Promise<any[]>((resolve) => {
        const seen: any[] = []
        const until = new Function('m', `return (${untilSrc})(m)`) as (m: any) => boolean
        const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/app:${appId}?token=${token}`)
        const done = () => { ws.close(); resolve(seen) }
        const timer = setTimeout(done, ms)
        ws.onopen = () => frames.forEach((f) => ws.send(JSON.stringify(f)))
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data as string)
          seen.push(m)
          if (until(m)) { clearTimeout(timer); done() }
        }
      }),
    { appId: APP_ID, token, frames, untilSrc: until.toString(), ms },
  )
}

/** Attempt a write; report whether the server accepted it. */
async function rawPut(page: Page, collection: string, recordId: string, data: object) {
  const requestId = `r-${Math.random().toString(36).slice(2)}`
  const msgs = await rawSocket(
    page,
    [{ type: 'core.put', payload: { collection, recordId, data, requestId } }],
    (m) => m.type === 'records.ack' || m.type === 'core.error',
  )
  const reply = msgs.find((m) => m.type === 'records.ack' || m.type === 'core.error')
  return { accepted: reply?.type === 'records.ack' && reply.payload.success === true, reply: reply?.payload }
}

async function rawQuery(page: Page, collection: string, where: object) {
  const msgs = await rawSocket(
    page,
    [{ type: 'core.subscribe', payload: { subscriptionId: 's1', query: { collection, where } } }],
    (m) => m.type === 'core.query_result' && m.payload.subscriptionId === 's1',
  )
  const result = msgs.find((m) => m.type === 'core.query_result')
  return (result?.payload.records ?? []) as Array<{ recordId: string; data: Record<string, any> }>
}

test('permissions are enforced by the server, even for hand-written clients', async ({ users }) => {
  test.setTimeout(120_000)
  const [host, alice, bob, viewer] = await users(NAMES)
  const link = await createDuelAsHost(host.page)
  const duelId = link.split('/').pop()!
  for (const u of [alice, bob, viewer]) await u.page.goto(link)
  for (const u of [alice, bob, viewer]) await expect(u.page.getByTestId('duel-room')).toBeVisible({ timeout: 20_000 })
  await action(alice.page, 'joinDuel', { duelId })
  await action(bob.page, 'joinDuel', { duelId })
  await action(host.page, 'startRound', { duelId })

  const aliceId = JSON.parse(Buffer.from((await tokenFor(alice.page)).split('.')[1], 'base64url').toString()).sub as string
  const bobId = JSON.parse(Buffer.from((await tokenFor(bob.page)).split('.')[1], 'base64url').toString()).sub as string
  const entries = await rawQuery(viewer.page, 'entries', { duelId })
  const aliceEntry = entries.find((e) => e.data.userId === aliceId)!
  expect(aliceEntry, 'a spectator can read both players\' entries').toBeTruthy()
  expect(entries).toHaveLength(2)
  const buggy = aliceEntry.data.code

  // Control: a player CAN edit their own code over the raw socket.
  expect((await rawPut(alice.page, 'entries', aliceEntry.recordId, { code: '// mine' })).accepted).toBe(true)

  // A spectator and the opponent cannot edit Alice's code.
  expect((await rawPut(viewer.page, 'entries', aliceEntry.recordId, { code: 'HACKED' })).accepted).toBe(false)
  expect((await rawPut(bob.page, 'entries', aliceEntry.recordId, { code: 'HACKED' })).accepted).toBe(false)
  // Alice cannot hand her entry to someone else (only `code` is writable).
  expect((await rawPut(alice.page, 'entries', aliceEntry.recordId, { userId: bobId })).accepted).toBe(false)

  // Nobody can set the winner, the clock, or the status on the duel...
  for (const who of [alice, host, viewer]) {
    expect((await rawPut(who.page, 'duels', duelId, { winnerId: aliceId, status: 'finished' })).accepted).toBe(false)
    expect((await rawPut(who.page, 'duels', duelId, { endsAt: Date.now() + 999_999_999 })).accepted).toBe(false)
  }
  // ...or forge a perfect test result.
  expect((await rawPut(alice.page, 'submissions', 'forged', { duelId, userId: aliceId, passed: 6, total: 6, at: 1, code: '' })).accepted).toBe(false)
  // Creating a duel is allowed, but only the title is accepted from the client.
  expect((await rawPut(viewer.page, 'duels', 'sneaky', { title: 'x', hostId: aliceId, status: 'finished', winnerId: bobId })).accepted).toBe(false)

  // The data really is unchanged.
  const after = await rawQuery(viewer.page, 'entries', { duelId })
  expect(after.find((e) => e.recordId === aliceEntry.recordId)!.data).toMatchObject({ userId: aliceId, code: '// mine' })
  expect(buggy).not.toBe('// mine')
  const duelRows = await rawQuery(viewer.page, 'duels', {})
  const duel = duelRows.find((d) => d.recordId === duelId)!
  expect(duel.data).toMatchObject({ status: 'running' })
  expect(duel.data.winnerId ?? '').toBe('')
  expect(duelRows.find((d) => d.recordId === 'sneaky')).toBeUndefined()
  expect(await rawQuery(viewer.page, 'submissions', { duelId })).toHaveLength(0)
})

test('timeout: the round ends for everyone at the deadline and the best score wins', async ({ users }) => {
  test.setTimeout(180_000)
  const [host, alice, bob, viewer] = await users(NAMES)
  const everyone = [host, alice, bob, viewer]
  const link = await createDuelAsHost(host.page, 60) // shortest allowed round
  for (const u of [alice, bob, viewer]) await u.page.goto(link)
  for (const u of everyone) await expect(u.page.getByTestId('duel-room')).toBeVisible({ timeout: 20_000 })
  await alice.page.getByTestId('join-player-btn').click()
  await bob.page.getByTestId('join-player-btn').click()
  await expect(host.page.getByTestId('start-round-btn')).toBeEnabled()
  await host.page.getByTestId('start-round-btn').click()
  for (const u of everyone) await expect(u.page.getByTestId('duel-room')).toHaveAttribute('data-status', 'running', { timeout: 20_000 })

  // Nobody solves it. Bob runs the unfixed code and scores something; Alice never runs her tests.
  await bob.page.getByTestId('run-tests-btn').click()
  await expect(bob.page.getByTestId('test-summary')).toBeVisible({ timeout: 20_000 })

  // In the last 15 seconds the countdown turns red (data-urgent) for everyone.
  for (const u of everyone) await expect(u.page.getByTestId('countdown')).toHaveAttribute('data-urgent', 'true', { timeout: 60_000 })

  // The server closes the round at the deadline; every screen flips together (about 60s after start).
  for (const u of everyone) {
    await expect(u.page.getByTestId('winner-screen')).toBeVisible({ timeout: 90_000 })
    await expect(u.page.getByTestId('winner-name')).toContainText('Bob')
    await expect(u.page.getByTestId('win-reason')).toContainText('best score when time ran out')
  }
})

test('an expired round resolves on the server with nobody connected (scheduled sweep)', async ({ users }) => {
  test.setTimeout(300_000)
  const [host, alice, bob, viewer] = await users(NAMES)
  const link = await createDuelAsHost(host.page, 60)
  const duelId = link.split('/').pop()!
  await alice.page.goto('/home')
  await bob.page.goto('/home')
  await viewer.page.goto('/home')
  expect(await action(alice.page, 'joinDuel', { duelId })).toMatchObject({ success: true })
  expect(await action(bob.page, 'joinDuel', { duelId })).toMatchObject({ success: true })
  expect(await action(host.page, 'startRound', { duelId })).toMatchObject({ success: true })
  const testCount = (await rawQuery(viewer.page, 'duels', {})).find((d) => d.recordId === duelId)!.data.testCount
  // Bob scores higher than Alice, then everybody who could close the round leaves.
  expect(await action(alice.page, 'submitResult', { duelId, passed: 1, total: testCount, code: 'a' })).toMatchObject({ success: true })
  expect(await action(bob.page, 'submitResult', { duelId, passed: 3, total: testCount, code: 'b' })).toMatchObject({ success: true })
  await host.page.close()
  await alice.page.close()
  await bob.page.close()

  // Only the viewer's lobby page is open (it never asks the server to finish a round).
  // The server's own clock must resolve the duel: the deadline is 60 s after start, the sweep runs every minute.
  await expect
    .poll(async () => (await rawQuery(viewer.page, 'duels', {})).find((d) => d.recordId === duelId)!.data.status, {
      timeout: 200_000,
      intervals: [5_000],
    })
    .toBe('finished')
  const duel = (await rawQuery(viewer.page, 'duels', {})).find((d) => d.recordId === duelId)!.data
  expect(duel).toMatchObject({ endReason: 'timeout' })
  expect(duel.winnerId).toBeTruthy() // Bob: 3 tests beat 1
})

test('code privacy: a player never receives the opponent\'s code, a spectator does, everyone gets it at the end', async ({ users }) => {
  test.setTimeout(150_000)
  const [host, alice, bob, viewer] = await users(NAMES)
  const link = await createDuelAsHost(host.page)
  const duelId = link.split('/').pop()!
  for (const u of [alice, bob]) await u.page.goto(link)
  for (const u of [alice, bob]) await expect(u.page.getByTestId('duel-room')).toBeVisible({ timeout: 20_000 })
  const aliceId = JSON.parse(Buffer.from((await tokenFor(alice.page)).split('.')[1], 'base64url').toString()).sub as string
  const bobId = JSON.parse(Buffer.from((await tokenFor(bob.page)).split('.')[1], 'base64url').toString()).sub as string
  await alice.page.getByTestId('join-player-btn').click()
  await bob.page.getByTestId('join-player-btn').click()
  await expect(host.page.getByTestId('start-round-btn')).toBeEnabled()
  await host.page.getByTestId('start-round-btn').click()
  for (const u of [alice, bob]) await expect(u.page.getByTestId('duel-room')).toHaveAttribute('data-status', 'running', { timeout: 20_000 })

  // Alice types something recognisable and runs her tests.
  const SECRET = `// SECRET_ALICE_${Date.now()}`
  await alice.page.getByTestId('my-editor').fill(SECRET)
  await alice.page.getByTestId('run-tests-btn').click()
  await expect(alice.page.getByTestId('test-summary')).toBeVisible({ timeout: 20_000 })

  // A late spectator opens the link only now, mid-round, and still gets both live editors.
  await viewer.page.goto(link)
  await expect(viewer.page.getByTestId('watch-editor')).toHaveCount(2, { timeout: 20_000 })
  await expect
    .poll(async () => (await viewer.page.getByTestId('watch-editor').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))).some((v) => v.includes(SECRET)), { timeout: 15_000 })
    .toBe(true)
  const spectatorView = await rawQuery(viewer.page, 'entries', { duelId })
  expect(spectatorView).toHaveLength(2)
  expect(JSON.stringify(spectatorView)).toContain(SECRET)

  // Bob, over a hand-written socket, receives ONLY his own entry. Alice's row never leaves the server.
  const bobEntries = await rawQuery(bob.page, 'entries', { duelId })
  expect(bobEntries).toHaveLength(1)
  expect(bobEntries[0].data.userId).toBe(bobId)
  expect(JSON.stringify(bobEntries)).not.toContain(SECRET)
  expect(await rawQuery(bob.page, 'entries', { duelId, userId: aliceId })).toHaveLength(0)

  // The code behind submissions is unreadable to every client; the public score rows carry no code.
  expect(await rawQuery(bob.page, 'solutions', { duelId })).toHaveLength(0)
  expect(await rawQuery(viewer.page, 'solutions', { duelId })).toHaveLength(0)
  const scores = await rawQuery(bob.page, 'submissions', { duelId })
  expect(scores.length).toBeGreaterThan(0) // Bob can see Alice's score...
  for (const row of scores) expect(Object.keys(row.data)).not.toContain('code') // ...but never her code
  // The spectator list is not readable either, so nobody can enroll themselves by writing to it.
  expect(await rawQuery(bob.page, 'team_members', {})).toHaveLength(0)
  expect((await rawPut(bob.page, 'team_members', `${duelId}:${bobId}`, { teamId: duelId, userId: bobId, status: 'active' })).accepted).toBe(false)

  // A player cannot register as a spectator to get around it: the server refuses.
  expect(await action(bob.page, 'watchDuel', { duelId })).toMatchObject({ success: true, data: { watching: false } })
  expect(await rawQuery(bob.page, 'entries', { duelId })).toHaveLength(1)

  // And nothing is revealed on the duel row until the round ends.
  const before = (await rawQuery(bob.page, 'duels', {})).find((d) => d.recordId === duelId)!
  expect(before.data.p1Code ?? '').toBe('')
  expect(before.data.p2Code ?? '').toBe('')

  // Round over: the server copies each player's best code onto the duel row, readable by everyone.
  expect(await action(host.page, 'finishRound', { duelId })).toMatchObject({ success: true })
  await expect(bob.page.getByTestId('reveal-code-p1')).toHaveValue(new RegExp(SECRET.replace(/[/]/g, '\\/')), { timeout: 20_000 })
  const after = (await rawQuery(bob.page, 'duels', {})).find((d) => d.recordId === duelId)!
  expect(after.data.p1Code).toContain(SECRET)
})

test('code privacy: a spectator who takes a player slot loses access to the opponent\'s code', async ({ users }) => {
  test.setTimeout(120_000)
  const [host, alice, bob] = await users(NAMES)
  const link = await createDuelAsHost(host.page)
  const duelId = link.split('/').pop()!
  await alice.page.goto(link)
  await bob.page.goto(link) // Bob arrives as a spectator and is registered to watch
  for (const u of [alice, bob]) await expect(u.page.getByTestId('duel-room')).toBeVisible({ timeout: 20_000 })
  const bobId = JSON.parse(Buffer.from((await tokenFor(bob.page)).split('.')[1], 'base64url').toString()).sub as string
  await alice.page.getByTestId('join-player-btn').click()
  await expect(alice.page.getByTestId('role-badge')).toHaveText('Player')

  // As a spectator Bob can read Alice's (still empty) editor row.
  await expect.poll(async () => (await rawQuery(bob.page, 'entries', { duelId })).length, { timeout: 15_000 }).toBe(1)

  // Bob takes the second slot: his spectator access must vanish with it.
  expect(await action(bob.page, 'joinDuel', { duelId })).toMatchObject({ success: true })
  const bobView = await rawQuery(bob.page, 'entries', { duelId })
  expect(bobView).toHaveLength(1)
  expect(bobView[0].data.userId).toBe(bobId)
})
