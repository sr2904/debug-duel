/**
 * Landing page: a STATIC page (no auth call, no realtime connection).
 *
 * It sits at the top level of src/pages/ (not under (app)/), so it renders with
 * no DeepSpace providers and is prerendered to plain HTML at build for crawlers.
 * Keep it renderable without a browser: no window/document during render.
 * "Start a duel" goes to /home, which asks signed-out visitors to sign in first.
 */

import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Footer } from '../components/Footer'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const STEPS = [
  { title: 'Create a duel', body: 'Name it, pick a round length from 1 to 10 minutes, and you are the host.' },
  { title: 'Share the link', body: 'The first two people to join take the player slots. Everyone else spectates live.' },
  { title: 'Race to fix the bug', body: 'Same broken function, hidden tests, and a shared countdown. Your opponent\'s code stays hidden while you race.' },
  { title: 'Winner + AI commentary', body: 'First to pass every test wins, decided by the server. An AI commentator then compares both fixes.' },
]

const CTA_CLASS =
  'inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 font-mono text-sm font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
            <Link to="/" className="text-sm" aria-label="DEBUG/DUEL home"><Brand /></Link>
            <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground" data-testid="landing-sign-in">
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:pt-20">
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary">Live 1v1 debugging</p>
            <h1 className="mt-5 max-w-4xl font-mono text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Two devs. One bug.
              <br />
              <span className="text-primary">First to green wins.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Race a friend to fix the same broken JavaScript function while everyone else watches both editors live.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/home" className={CTA_CLASS} data-testid="landing-start-duel">Start a duel</Link>
              <a href="#how" className="font-mono text-sm uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                How it works
              </a>
            </div>

            <figure className="mt-12 overflow-hidden rounded-lg border-2 border-border shadow-[0_0_60px_-20px_var(--color-p1)]">
              <img src="/screens/duel-room.png" alt="The duel room: two editors side by side with a shared countdown, live status and score bars" width={1280} height={848} className="h-auto w-full" />
            </figure>
          </section>

          <section id="how" className="border-y border-border bg-card/40">
            <div className="mx-auto max-w-6xl px-4 py-14">
              <h2 className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">How it works</h2>
              <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="how-it-works">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="rounded-lg border border-border bg-card p-5">
                    <span className="font-mono text-3xl font-black text-primary">{i + 1}</span>
                    <h3 className="mt-3 font-mono text-base font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-2">
            <div>
              <h2 className="font-mono text-2xl font-black sm:text-3xl">Every round ends with a result you can trust.</h2>
              <p className="mt-4 text-muted-foreground">
                The server owns the clock and the winner. Hidden tests, a live progress bar for each player, and a reveal of both solutions when the round is over, with an AI recap of what each of you actually fixed.
              </p>
              <Link to="/home" className={`${CTA_CLASS} mt-8`}>Start a duel</Link>
            </div>
            <figure className="overflow-hidden rounded-lg border-2 border-border shadow-[0_0_60px_-20px_var(--color-p2)]">
              <img src="/screens/winner.png" alt="The winner screen: the winner's name, both final scores, and the AI commentary" width={1280} height={805} loading="lazy" className="h-auto w-full" />
            </figure>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
