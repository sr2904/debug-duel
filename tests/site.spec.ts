/**
 * The public site around the game: landing page, brand, footer, lobby tip.
 * Signed-out checks need no accounts; the lobby check needs the Host test account.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

const REPO = 'https://github.com/sr2904/debug-duel'

test.describe('landing page (signed out)', () => {
  test('has the hero, a 4-step how-it-works, screenshots, brand and footer', async ({ page }) => {
    await page.goto('/')
    const landing = page.getByTestId('static-landing')
    await expect(landing).toBeVisible()
    await expect(landing.getByRole('heading', { level: 1 })).toContainText('First to green wins.')
    await expect(landing.getByText('DEBUG/DUEL').first()).toBeVisible()

    const steps = page.getByTestId('how-it-works').locator('li')
    await expect(steps).toHaveCount(4)
    await expect(steps.nth(0)).toContainText('Create a duel')
    await expect(steps.nth(1)).toContainText('Share the link')
    await expect(steps.nth(2)).toContainText('Race to fix the bug')
    await expect(steps.nth(3)).toContainText('Winner + AI commentary')

    // Two real screenshots, actually loaded (not broken images).
    const images = landing.locator('img')
    await expect(images).toHaveCount(2)
    await images.nth(1).scrollIntoViewIfNeeded()
    for (const img of await images.all()) {
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
    }

    await expect(page.getByTestId('footer-github')).toHaveAttribute('href', REPO)
  })

  test('"Start a duel" leads a signed-out visitor to sign-in', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('landing-start-duel').click()
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByText('Sign in to continue')).toBeVisible({ timeout: 15_000 })
    // The app shell on a signed-out page still carries the brand and the footer.
    await expect(page.getByTestId('app-navigation')).toContainText('DEBUG/DUEL')
    await expect(page.getByTestId('footer-github')).toHaveAttribute('href', REPO)
  })

  test('the 404 page carries the brand and footer too', async ({ page }) => {
    await page.goto('/no-such-page-xyz')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('DEBUG/DUEL').first()).toBeVisible()
    await expect(page.getByTestId('footer-github')).toHaveAttribute('href', REPO)
  })
})

test.describe('lobby (signed in)', () => {
  test.skip(!loadAllTestAccounts().some((a) => a.name === 'Host'), 'Needs a test account named Host.')

  test('shows the solo-testing tip, the brand, no Settings link, and the footer', async ({ users }) => {
    const [host] = await users(['Host'])
    await host.page.goto('/home')
    await expect(host.page.getByTestId('solo-tip')).toContainText('Testing alone?')
    await expect(host.page.getByTestId('solo-tip')).toContainText('private window')
    await expect(host.page.getByTestId('solo-tip')).toContainText('second account')
    await expect(host.page.getByTestId('app-navigation')).toContainText('DEBUG/DUEL')
    // Template cleanup: no Settings link in the nav or in the account menu, and the page is gone.
    await expect(host.page.getByRole('link', { name: 'Settings' })).toHaveCount(0)
    await host.page.getByLabel('Account menu').click()
    await expect(host.page.getByText('Settings')).toHaveCount(0)
    await host.page.keyboard.press('Escape')
    await expect(host.page.getByTestId('footer-github')).toHaveAttribute('href', REPO)
    await host.page.goto('/settings')
    await expect(host.page.getByText('404')).toBeVisible()
  })
})
