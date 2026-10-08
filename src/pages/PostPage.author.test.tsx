import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import rawPosts from '../test/fixtures/posts.json'
import { renderLocalized } from '../test/renderLocalized'

// The second post of the API: its author also wrote other posts, which show
// as cards under Latest articles and must not carry a second author link.
const post = rawPosts[1]
const { author } = post

async function authorLink() {
  await screen.findByRole('heading', { level: 1 })
  const links = await screen.findAllByRole('link', { name: author.name })
  expect(links, 'one link named after the author on the post page').toHaveLength(1)
  return links[0]
}

async function tabTo(element: HTMLElement) {
  const user = userEvent.setup()
  for (let presses = 0; presses < 40 && document.activeElement !== element; presses += 1) {
    await user.tab()
  }
  expect(document.activeElement, 'the author link is reached with the Tab key').toBe(element)
  return user
}

it('A2 the author name on the post is a link to the author page, reached by keyboard and opened with Enter', async () => {
  const { location } = renderLocalized(`/posts/${post.id}`)

  const link = await authorLink()
  expect(link).toHaveAttribute('href', `/authors/${author.id}`)

  const user = await tabTo(link)
  await user.keyboard('{Enter}')

  expect(await screen.findByRole('heading', { level: 1, name: author.name })).toBeInTheDocument()
  expect(location().pathname).toBe(`/authors/${author.id}`)
})

it('A2 the author link is the same in Spanish', async () => {
  renderLocalized(`/posts/${post.id}`, { locale: 'es' })

  const link = await authorLink()
  expect(link).toHaveAttribute('href', `/authors/${author.id}`)
})
