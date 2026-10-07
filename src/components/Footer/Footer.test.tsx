import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import proofCount from '../../proof/proof-count.json'
import { renderApp } from '../../test/renderApp'

const LINK_NAME = `How this blog was tested: hunt the ${proofCount.total} planted bugs`

it('C21 shows in the footer of the list, of a post and of a page that does not exist a link to /proof named with the total from proof-count.json', async () => {
  expect(proofCount.total, 'proof-count.json has a total').toBeGreaterThan(0)

  const routes = [
    '/',
    '/posts/cc8a8c63-2f82-4745-8b6e-28f88ff73fdd',
    '/nao-existe',
  ]
  for (const route of routes) {
    const { unmount } = renderApp(route)

    const footer = await screen.findByRole('contentinfo')
    const link = within(footer).getByRole('link', { name: LINK_NAME })
    expect(link, `${route}: the link goes to /proof`).toHaveAttribute('href', '/proof')

    unmount()
  }
})

it('C25 has Back to the blog and no link to /proof in the footer of /proof, and Back goes to / or to where the reader came from', async () => {
  const user = userEvent.setup()

  // Opened directly: nothing of the app is behind it, so Back goes to the list.
  const direct = renderApp('/proof')
  let footer = await screen.findByRole('contentinfo')
  expect(
    within(footer).queryByRole('link', { name: /How this blog was tested/ }),
    'no link to /proof inside /proof',
  ).not.toBeInTheDocument()
  await user.click(within(footer).getByRole('button', { name: 'Back to the blog' }))
  await waitFor(() => expect(direct.location().pathname).toBe('/'))
  direct.unmount()

  // Coming from the list with a search: Back returns to that very address.
  const fromList = renderApp('/?q=tech')
  footer = await screen.findByRole('contentinfo')
  await user.click(within(footer).getByRole('link', { name: LINK_NAME }))
  await waitFor(() => expect(fromList.location().pathname).toBe('/proof'))
  footer = await screen.findByRole('contentinfo')
  await user.click(await within(footer).findByRole('button', { name: 'Back to the blog' }))
  await waitFor(() => expect(fromList.location().pathname).toBe('/'))
  expect(fromList.location().search).toBe('?q=tech')
})
