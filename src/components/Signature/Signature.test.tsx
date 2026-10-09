import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'

const SIGNATURE_NAME =
  'eltonleao.dev: science, technology, art and philosophy (opens in a new tab)'

it('SIG1 signs the footer of the list, of a post, of a page that does not exist and of /proof with a link to eltonleao.dev that says it opens a new tab', async () => {
  const routes = [
    '/',
    '/posts/cc8a8c63-2f82-4745-8b6e-28f88ff73fdd',
    '/nao-existe',
    '/proof',
  ]
  for (const route of routes) {
    const { unmount } = renderApp(route)

    const footer = await screen.findByRole('contentinfo')
    const link = within(footer).getByRole('link', { name: SIGNATURE_NAME })
    expect(link, `${route}: the signature goes to eltonleao.dev`).toHaveAttribute(
      'href',
      'https://eltonleao.dev',
    )
    expect(link, `${route}: in a new tab`).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel'), `${route}: without the opener`).toContain('noopener')

    unmount()
  }
})

it('SIG2 keeps the link to the bug hunt as the link right under the footer, where the pixel attestation looks for it', async () => {
  const { unmount } = renderApp('/')

  const footer = await screen.findByRole('contentinfo')
  const direct = footer.querySelectorAll(':scope > a')
  expect(direct, 'one link right under the footer').toHaveLength(1)
  expect(direct[0]).toHaveAttribute('href', '/proof')

  unmount()
})
