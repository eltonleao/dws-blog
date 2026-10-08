import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { spanishOf } from '../../test/dictionaries'
import { renderApp } from '../../test/renderApp'
import { renderLocalized } from '../../test/renderLocalized'

// Amended for the explorer branch (07/10/2026): the footer no longer leads to
// /proof. C21 became L1 and C25 became L2; the record is in
// .verification/dentsu-P1/problems.md.

const POST_ROUTE = '/posts/cc8a8c63-2f82-4745-8b6e-28f88ff73fdd'

it('L1 (C21, amended) has no link to /proof and no contentinfo on the list, on a post and on a page that does not exist', async () => {
  const routes = [
    { route: '/', ready: () => screen.findByRole('heading', { level: 1, name: 'DWS blog' }) },
    { route: POST_ROUTE, ready: () => screen.findByRole('heading', { level: 1, name: 'Tech Innovations in Healthcare' }) },
    { route: '/nao-existe', ready: () => screen.findByRole('heading', { level: 1, name: 'Post not found' }) },
  ]
  for (const { route, ready } of routes) {
    const { unmount } = renderApp(route)
    await ready()

    expect(
      screen.queryByRole('link', { name: /How this blog was tested/ }),
      `${route}: no link named after the bug hunt`,
    ).not.toBeInTheDocument()
    expect(document.querySelector('a[href="/proof"]'), `${route}: no link to /proof`).toBeNull()
    expect(screen.queryByRole('contentinfo'), `${route}: no contentinfo`).not.toBeInTheDocument()

    unmount()
  }
})

it('L2 (C25, amended) keeps the Back to the blog button on /proof opened directly, takes it to /, and leaves no footer there', async () => {
  const user = userEvent.setup()

  // Opened directly: nothing of the app is behind it, so Back goes to the list.
  const direct = renderApp('/proof')
  const footer = await screen.findByRole('contentinfo')
  expect(
    within(footer).queryByRole('link', { name: /How this blog was tested/ }),
    'no link to /proof inside /proof',
  ).not.toBeInTheDocument()
  expect(footer.querySelector('a[href="/proof"]')).toBeNull()
  await user.click(within(footer).getByRole('button', { name: 'Back to the blog' }))

  await waitFor(() => expect(direct.location().pathname).toBe('/'))
  expect(await screen.findByRole('heading', { level: 1, name: 'DWS blog' })).toBeInTheDocument()
  expect(screen.queryByRole('contentinfo'), 'the list has no footer').not.toBeInTheDocument()
})

it('L2 (C25, amended) takes Back to the blog to the address the reader came from, with two entries in the history', async () => {
  const user = userEvent.setup()

  const app = renderLocalized(['/?q=tech', '/proof'], { index: 1 })
  const footer = await screen.findByRole('contentinfo')
  await user.click(within(footer).getByRole('button', { name: 'Back to the blog' }))

  await waitFor(() => expect(app.location().pathname).toBe('/'))
  expect(app.location().search).toBe('?q=tech')
  expect(screen.queryByRole('contentinfo'), 'the list has no footer').not.toBeInTheDocument()
})

it('L2 (C25, amended) says Back to the blog in Spanish on /proof, and keeps the button', async () => {
  renderLocalized('/proof', { locale: 'es' })

  const footer = await screen.findByRole('contentinfo')
  expect(within(footer).getByRole('button', { name: spanishOf('Back to the blog') })).toBeInTheDocument()
  expect(within(footer).queryByRole('button', { name: 'Back to the blog' })).not.toBeInTheDocument()
  expect(footer.querySelector('a[href="/proof"]')).toBeNull()
})
