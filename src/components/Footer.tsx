import { Brand } from './Brand'

export const REPO_URL = 'https://github.com/sr2904/debug-duel'

/** A small footer for every page. */
export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground" data-testid="footer">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <Brand className="text-[11px] text-foreground/80" />
        <span>
          Built on DeepSpace ·{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground" data-testid="footer-github">
            Source on GitHub
          </a>
        </span>
      </div>
    </footer>
  )
}
