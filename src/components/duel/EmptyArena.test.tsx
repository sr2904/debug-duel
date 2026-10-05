import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EmptyArena } from './EmptyArena'

describe('EmptyArena', () => {
  it('renders a friendly empty state with a way to start', () => {
    const html = renderToStaticMarkup(<EmptyArena onStart={() => {}} />)
    expect(html).toContain('data-testid="no-duels"')
    expect(html).toContain('The arena is empty.')
    expect(html).toContain('Name your first duel')
  })
})
