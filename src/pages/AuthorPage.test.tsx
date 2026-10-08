import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import { es } from '../test/dictionaries'
import rawPosts from '../test/fixtures/posts.json'
import { renderLocalized } from '../test/renderLocalized'
import { POSTS_URL, server } from '../test/server'

type RawPost = (typeof rawPosts)[number]

const byAuthor = (name: string): RawPost[] => rawPosts.filter((post) => post.author.name === name)

// Three authors with one, two and three posts, so the plural has all its cases.
const ONE = byAuthor('Emily Davis').slice(0, 1)
const TWO = byAuthor('Michael Johnson').slice(0, 2)
const THREE = byAuthor('Jack Smith').slice(0, 3)

const cardHrefs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLAnchorElement>('main a[href^="/posts/"]')).map((link) =>
    link.getAttribute('href'),
  )

const idsOf = (posts: RawPost[]) => posts.map((post) => `/posts/${post.id}`)

function serveThreeAuthors() {
  server.use(http.get(POSTS_URL, () => HttpResponse.json([...ONE, ...TWO, ...THREE])))
}

it('A1 /authors/:id lists only the posts of the author, with the name as h1 and the count in English', async () => {
  serveThreeAuthors()
  const { container } = renderLocalized(`/authors/${THREE[0].author.id}`)

  expect(await screen.findByRole('heading', { level: 1, name: 'Jack Smith' })).toBeInTheDocument()
  await waitFor(() => expect(cardHrefs(container)).toHaveLength(3))
  expect(cardHrefs(container)).toEqual(idsOf(THREE))
  expect(screen.getByText('3 posts')).toBeInTheDocument()
})

it('A1 the count of the author page is pluralized: 1 post, 2 posts', async () => {
  serveThreeAuthors()
  const first = renderLocalized(`/authors/${ONE[0].author.id}`)
  expect(await screen.findByRole('heading', { level: 1, name: 'Emily Davis' })).toBeInTheDocument()
  expect(screen.getByText('1 post')).toBeInTheDocument()
  expect(screen.queryByText('1 posts')).not.toBeInTheDocument()
  expect(cardHrefs(first.container)).toEqual(idsOf(ONE))
  first.unmount()

  const second = renderLocalized(`/authors/${TWO[0].author.id}`)
  expect(await screen.findByRole('heading', { level: 1, name: 'Michael Johnson' })).toBeInTheDocument()
  expect(screen.getByText('2 posts')).toBeInTheDocument()
  expect(cardHrefs(second.container)).toEqual(idsOf(TWO))
})

it('A1 the author page counts in Spanish when Spanish is chosen, and the English count is gone', async () => {
  serveThreeAuthors()
  const { container } = renderLocalized(`/authors/${THREE[0].author.id}`, { locale: 'es' })

  expect(await screen.findByRole('heading', { level: 1, name: 'Jack Smith' })).toBeInTheDocument()
  await waitFor(() => expect(cardHrefs(container)).toHaveLength(3))
  expect(cardHrefs(container)).toEqual(idsOf(THREE))
  expect(screen.queryByText('3 posts')).not.toBeInTheDocument()
  // The number leads the count, and the word after it is the Spanish one.
  const count = screen.getByText(/^3 \S+/)
  expect(count.textContent).toBe(es['list.count.other'].replace('{count}', '3'))
})

it('A1 an author id that no post has shows the not found screen, in English and in Spanish', async () => {
  const english = renderLocalized('/authors/no-such-author')
  expect(await screen.findByRole('heading', { level: 1, name: 'Post not found' })).toBeInTheDocument()
  english.unmount()

  renderLocalized('/authors/no-such-author', { locale: 'es' })
  expect(await screen.findByRole('heading', { level: 1, name: es['notFound.title'] })).toBeInTheDocument()
})
