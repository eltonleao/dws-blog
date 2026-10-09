import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import { content as written } from '../content/en'
import { toParagraphs } from '../lib/paragraphs'
import rawPosts from '../test/fixtures/posts.json'
import { renderApp } from '../test/renderApp'
import { POSTS_URL, postsHandler, server } from '../test/server'

// The 26 posts share one date, so Newest is the API order (D1).
const TITLES = new Set(rawPosts.map((post) => post.title))

// A card is the link that carries the post title as its name (C11). On the post
// page the only cards are the ones under Latest articles: the logo link and the
// Back control are not named after a post.
const cardLinks = () =>
  screen.queryAllByRole('link', { name: (name) => TITLES.has(name) })

async function cardsLoaded(count = 26) {
  await waitFor(() => expect(cardLinks()).toHaveLength(count))
}

const postPath = (post: { id: string }) => `/posts/${post.id}`

// True when `node` comes before `later` in the document. The post's own text
// (author, date, paragraphs) comes before the Latest articles heading, and the
// cards come after it; every card repeats the author and the date of a post
// and the start of the same content, so this is what tells the two apart.
const isBefore = (node: Node, later: Node) =>
  Boolean(later.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING)

// What C15 and C17 share: the not-found screen is one screen, and it is not
// the error screen of C16.
async function expectNotFoundScreen() {
  expect(await screen.findByText('Post not found')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Try again' }),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
}

it('C14 shows the post with its title as h1, the author, Sep 19, 2026, three paragraphs, and Latest articles with three cards that leave the current post out', async () => {
  // The second post of the API: it is among the first three, so a list of the
  // newest posts that forgot to leave the current one out would show it.
  const post = rawPosts[1]
  const newest = rawPosts.filter((other) => other.id !== post.id).slice(0, 3)
  // The page shows the written text of the post, not the lorem ipsum of the fixture.
  const paragraphs = toParagraphs(written[post.id].content)
  expect(paragraphs.length, 'the written text has its paragraphs').toBeGreaterThanOrEqual(4)

  renderApp(postPath(post))

  await screen.findByRole('heading', { level: 1, name: post.title })
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  await cardsLoaded(3)

  const latest = screen.getByText('Latest articles')
  const before = <T extends Node>(nodes: T[]) =>
    nodes.filter((node) => isBefore(node, latest))
  const mentions = (text: string) =>
    before(screen.queryAllByText((content) => content.includes(text)))

  // The author and the date are the post's, not the ones the cards repeat.
  expect(mentions(post.author.name), 'the author before Latest articles').not.toHaveLength(0)
  expect(mentions('Sep 19, 2026'), 'the date before Latest articles').not.toHaveLength(0)

  // Three paragraphs, one element each, in the order of the content.
  const shown = before(Array.from(document.querySelectorAll('p')))
    .map((paragraph) => paragraph.textContent?.trim() ?? '')
    .filter((text) => paragraphs.includes(text))
  expect(shown).toEqual(paragraphs)

  // Latest articles: the three newest posts, in the Newest order, without this one.
  const cards = cardLinks()
  expect(cards.map((link) => link.textContent?.trim())).toEqual(
    newest.map((other) => other.title),
  )
  expect(cards.map((link) => link.getAttribute('href'))).toEqual(
    newest.map(postPath),
  )
  expect(cards.map((link) => link.textContent?.trim())).not.toContain(post.title)
  for (const card of cards) {
    expect(isBefore(latest, card), 'each card comes after the Latest articles heading').toBe(true)
  }
})

it('C15 shows Post not found with Back and without Try again for an id the list does not have, and never requests that id', async () => {
  // Every request that reaches the mocked network, by path.
  const requested: string[] = []
  const onStart = ({ request }: { request: Request }) => {
    requested.push(new URL(request.url).pathname)
  }
  server.events.on('request:start', onStart)
  try {
    renderApp('/posts/nao-existe')

    await expectNotFoundScreen()

    // The post is looked up in the list that is already being fetched: the
    // list was asked for, and nothing under /posts/ besides it.
    await waitFor(() => expect(requested).toContain('/posts/'))
    expect(requested.filter((path) => path !== '/posts/')).toEqual([])
  } finally {
    server.events.removeListener('request:start', onStart)
  }
})

it('C16 shows Something went wrong with Try again and Back when the API answers 500 on the post route, and Try again brings the post back once it recovers', async () => {
  const user = userEvent.setup()
  const post = rawPosts[1]
  server.use(http.get(POSTS_URL, () => new HttpResponse(null, { status: 500 })))

  renderApp(postPath(post))

  expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  const retry = screen.getByRole('button', { name: 'Try again' })
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  // A server error is not a missing post.
  expect(screen.queryByText('Post not found')).not.toBeInTheDocument()

  // The API is back: the default handler answers 200 again.
  server.use(postsHandler)
  await user.click(retry)

  expect(
    await screen.findByRole('heading', { level: 1, name: post.title }),
  ).toBeInTheDocument()
  expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
})

it('C17 shows the same not-found screen on an unknown route, with a link to the list', async () => {
  const user = userEvent.setup()
  const { location } = renderApp('/qualquer')

  await expectNotFoundScreen()

  // The logo in the header links to the list on every screen, so it would make
  // this check pass on an empty page: the link has to be in the body.
  const header = screen.queryByRole('banner')
  const toList = screen
    .getAllByRole('link')
    .filter((link) => !header?.contains(link) && link.getAttribute('href') === '/')
  expect(toList, 'a link to the list outside the header').not.toHaveLength(0)

  await user.click(toList[0])
  expect(location().pathname).toBe('/')
  await cardsLoaded()
})

it('C18 sets the document title to "{title} | DWS Blog" and moves the focus to the h1 when a post opens, loaded directly and reached from the list', async () => {
  // Loaded directly: the h1 does not exist until the list has answered, so the
  // focus has to follow the h1 and not the first render of the page.
  const direct = rawPosts[1]
  const first = renderApp(postPath(direct))

  const heading = await screen.findByRole('heading', {
    level: 1,
    name: direct.title,
  })
  await waitFor(() => expect(heading).toHaveFocus())
  expect(document.title).toBe(`${direct.title} | DWS Blog`)
  first.unmount()

  // Reached from the list: the card is a link, and the page that opens takes
  // the focus from it.
  const user = userEvent.setup()
  const other = rawPosts[3]
  renderApp()
  await cardsLoaded()
  await user.click(screen.getByRole('link', { name: other.title }))

  const opened = await screen.findByRole('heading', {
    level: 1,
    name: other.title,
  })
  await waitFor(() => expect(opened).toHaveFocus())
  expect(document.title).toBe(`${other.title} | DWS Blog`)
})
