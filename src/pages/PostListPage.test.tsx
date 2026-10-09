import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { expect, it, vi } from 'vitest'
import rawPosts from '../test/fixtures/posts.json'
import { renderApp } from '../test/renderApp'
import { POSTS_URL, postsHandler, server } from '../test/server'
import { setViewport } from '../test/setup'

// C20 counts the calls of PostCard. The mock wraps the real component, so every
// other test still renders the real card. Hoisted because vi.mock runs before
// the imports.
const cardRenders = vi.hoisted(() => ({ calls: 0 }))

vi.mock('../components/PostCard/PostCard', async (importActual) => {
  const actual =
    await importActual<typeof import('../components/PostCard/PostCard')>()
  // Lower case on purpose: this is a spy around the card, not a component the
  // React Compiler should memoize.
  const countingPostCard = (props: Parameters<typeof actual.PostCard>[0]) => {
    cardRenders.calls += 1
    return actual.PostCard(props)
  }
  return { ...actual, PostCard: countingPostCard }
})

// Newest first is the API order, because the 26 posts share one date (D1).
const API_ORDER = rawPosts.map((post) => post.title)
const TITLES = new Set(API_ORDER)

// The six posts whose title, author or category contains "tech", in API order.
const TECH_MATCHES = [
  'Tech Innovations in Healthcare',
  'Impact of Tech on Education',
  'The Future of AI in Technology',
  'Innovations in Sports Technology',
  'Emerging Technologies in Sports',
  'Technology in the Creative Indutries',
]

// A card is the link that carries the post title as its name (C11). Links that
// belong to the page and not to a post (the logo) are not cards.
const cardLinks = () =>
  screen.queryAllByRole('link', { name: (name) => TITLES.has(name) })
const cardTitles = () => cardLinks().map((link) => link.textContent?.trim())

// Same as cardLinks, but also the ones the accessibility tree does not show:
// C20 asks whether the grid stays mounted under the search panel.
const mountedCardLinks = () =>
  screen.queryAllByRole('link', {
    hidden: true,
    name: (name) => TITLES.has(name),
  })

async function cardsLoaded(count = 26) {
  await waitFor(() => expect(cardLinks()).toHaveLength(count))
}

// The thumbnails are the only images that come from the API's image host with
// a "thumb-" name; the logo and the icons are not.
const thumbnails = () =>
  Array.from(document.querySelectorAll('img')).filter((image) =>
    /\/images\/thumb-\d+\.jpg$/.test(image.getAttribute('src') ?? ''),
  )

// The card root: the nearest ancestor of the title link (or the link itself)
// that holds the image.
function cardOf(link: HTMLElement): HTMLElement {
  let node: HTMLElement | null = link
  while (node && !node.querySelector('img')) node = node.parentElement
  if (!node) throw new Error(`The card of "${link.textContent}" has no image`)
  return node
}

it('C1 shows a loading status and no card link before the API answers', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get(POSTS_URL, async () => {
      await gate
      return HttpResponse.json(rawPosts)
    }),
  )

  renderApp()

  const loading = screen
    .getAllByRole('status')
    .filter((element) => /loading posts/i.test(element.textContent ?? ''))
  expect(loading).toHaveLength(1)
  expect(cardLinks()).toHaveLength(0)

  // Once the API answers, the status goes away and the cards come in.
  release()
  await cardsLoaded()
  expect(screen.queryByText(/loading posts/i)).not.toBeInTheDocument()
})

it('C2 shows Something went wrong with Try again when the API answers 500, and Try again loads the 26 posts once it recovers', async () => {
  const user = userEvent.setup()
  server.use(http.get(POSTS_URL, () => new HttpResponse(null, { status: 500 })))

  renderApp()

  expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  expect(cardLinks()).toHaveLength(0)
  const retry = screen.getByRole('button', { name: 'Try again' })

  // The API is back: the default handler answers 200 again.
  server.use(postsHandler)
  await user.click(retry)

  await cardsLoaded()
  expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
})

it('C3 shows the same error when the 200 answer is HTML, or JSON that is not a list, without an unhandled error', async () => {
  const answers = [
    // 200 with HTML in the body.
    () =>
      HttpResponse.html(
        '<!doctype html><html><body><h1>Under maintenance</h1></body></html>',
      ),
    // 200 with valid JSON of the wrong shape: it reaches parsePosts.
    () => HttpResponse.json({ message: 'ok' }),
  ]

  for (const answer of answers) {
    // A queryFn that throws makes RTK Query log an unhandled error; the
    // try/catch around parsePosts is what keeps the console quiet.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      server.use(http.get(POSTS_URL, answer))
      const { unmount } = renderApp()

      expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      expect(cardLinks()).toHaveLength(0)
      expect(consoleError).not.toHaveBeenCalled()

      unmount()
    } finally {
      consoleError.mockRestore()
    }
  }
})

it('C4 shows Something went wrong with Try again when the API does not answer within the timeout', async () => {
  server.use(http.get(POSTS_URL, () => delay('infinite')))

  renderApp('/', { apiTimeoutMs: 50 })

  expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(cardLinks()).toHaveLength(0)
})

it('C5 filters on the spot with the mobile Category dropdown, which follows the listbox pattern', async () => {
  setViewport('mobile')
  const user = userEvent.setup()
  renderApp()
  await cardsLoaded()

  const button = screen.getByRole('button', { name: 'Category' })
  expect(button).toHaveAttribute('aria-haspopup', 'listbox')
  expect(button).toHaveAttribute('aria-expanded', 'false')

  await user.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true')

  const technology = screen.getByRole('option', { name: 'Technology' })
  const science = screen.getByRole('option', { name: 'Science' })
  expect(technology).not.toHaveAttribute('aria-selected', 'true')
  await user.click(technology)
  await user.click(science)

  // Choosing filters at once, with no apply step, and the list stays open.
  expect(technology).toHaveAttribute('aria-selected', 'true')
  expect(science).toHaveAttribute('aria-selected', 'true')
  expect(cardTitles()).toEqual([
    'Tech Innovations in Healthcare',
    'Climate Change and Its Effects',
  ])
  expect(button).toHaveTextContent('Technology, Science')

  // Esc closes the list and gives the focus back to the button.
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(button).toHaveFocus()

  // The X clears the choice and the 26 posts come back.
  await user.click(screen.getByRole('button', { name: /^clear category$/i }))
  expect(cardLinks()).toHaveLength(26)
  expect(button).toHaveTextContent('Category')
  expect(button).not.toHaveTextContent('Technology')
})

it('C6 only marks a sidebar item until Apply filters, and then filters', async () => {
  const user = userEvent.setup()
  renderApp()
  await cardsLoaded()

  const technology = screen.getByRole('button', { name: 'Technology' })
  expect(technology).toHaveAttribute('aria-pressed', 'false')
  await user.click(technology)

  expect(technology).toHaveAttribute('aria-pressed', 'true')
  expect(cardLinks()).toHaveLength(26)

  await user.click(screen.getByRole('button', { name: 'Apply filters' }))
  expect(cardTitles()).toEqual(['Tech Innovations in Healthcare'])
})

it('C7 shows No posts found when the filters match nothing, and Clear filters clears the search and the filters', async () => {
  const user = userEvent.setup()
  renderApp()
  await cardsLoaded()

  await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'a')
  // Technology belongs to a post by Emily Davis, not by Michael Johnson.
  await user.click(screen.getByRole('button', { name: 'Technology' }))
  await user.click(screen.getByRole('button', { name: 'Michael Johnson' }))
  await user.click(screen.getByRole('button', { name: 'Apply filters' }))

  expect(await screen.findByText('No posts found')).toBeInTheDocument()
  expect(cardLinks()).toHaveLength(0)

  await user.click(screen.getByRole('button', { name: 'Clear filters' }))

  expect(cardLinks()).toHaveLength(26)
  expect(screen.queryByText('No posts found')).not.toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Technology' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect(screen.getByRole('button', { name: 'Michael Johnson' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

it('C8 sorts with one button that names the current order, and announces the change in a live region', async () => {
  const user = userEvent.setup()
  renderApp()
  await cardsLoaded()
  expect(cardTitles()).toEqual(API_ORDER)

  const sort = screen.getByRole('button', { name: 'Newest first' })
  expect(sort).not.toHaveAttribute('aria-pressed')
  await user.click(sort)

  const oldest = screen.getByRole('button', { name: 'Oldest first' })
  expect(oldest).not.toHaveAttribute('aria-pressed')
  expect(cardTitles()).toEqual([...API_ORDER].reverse())
  const announcement = await screen.findByText('Sorted by oldest first')
  expect(
    announcement.closest('[aria-live="polite"], [role="status"]'),
  ).not.toBeNull()
})

it('C9 filters the list on every key typed in the desktop search field, and Enter does not navigate', async () => {
  const user = userEvent.setup()
  const { location } = renderApp()
  await cardsLoaded()

  const search = screen.getByRole('searchbox', { name: 'Search' })
  await user.type(search, 'emily')
  expect(cardTitles()).toEqual(API_ORDER.slice(0, 6))

  // A submit that reaches the browser would reload the page: it has to be
  // cancelled, and the router must stay where it is.
  const submits: boolean[] = []
  const onSubmit = (event: Event) => submits.push(event.defaultPrevented)
  document.addEventListener('submit', onSubmit)
  try {
    await user.keyboard('{Enter}')
  } finally {
    document.removeEventListener('submit', onSubmit)
  }
  expect(submits.every(Boolean)).toBe(true)
  expect(location().pathname).toBe('/')
  expect(cardLinks()).toHaveLength(6)
})

it('C10 opens the mobile search panel with the focus in the field, lists the matching titles, and closes giving the focus back', async () => {
  setViewport('mobile')
  const user = userEvent.setup()
  const { location } = renderApp()
  await cardsLoaded()

  const open = screen.getByRole('button', { name: 'Search' })
  expect(open).toHaveAttribute('aria-expanded', 'false')
  await user.click(open)

  expect(open).toHaveAttribute('aria-expanded', 'true')
  const panel = screen.getByRole('dialog', { name: 'Search' })
  const field = within(panel).getByRole('searchbox', { name: 'Search' })
  expect(field).toHaveFocus()

  await user.type(field, 'tech')
  const listed = within(panel)
    .getAllByRole('link')
    .map((link) => link.textContent?.trim())
  expect(listed).toEqual(TECH_MATCHES)

  // The X clears the text.
  await user.click(within(panel).getByRole('button', { name: 'Clear search' }))
  expect(field).toHaveValue('')

  // The back arrow closes the panel and the focus returns to the search button.
  await user.click(within(panel).getByRole('button', { name: 'Close search' }))
  expect(screen.queryByRole('dialog', { name: 'Search' })).not.toBeInTheDocument()
  expect(open).toHaveAttribute('aria-expanded', 'false')
  expect(open).toHaveFocus()

  // Tapping a listed title goes to its post. The post page is C3's: here the
  // router location is enough.
  await user.click(open)
  const reopened = screen.getByRole('dialog', { name: 'Search' })
  await user.type(within(reopened).getByRole('searchbox', { name: 'Search' }), 'tech')
  await user.click(
    within(reopened).getByRole('link', { name: 'Tech Innovations in Healthcare' }),
  )
  expect(location().pathname).toBe(`/posts/${rawPosts[0].id}`)
})

it('C11 renders one link per card, named by the post title, with a decorative image', async () => {
  renderApp()
  await cardsLoaded()

  for (const title of API_ORDER) {
    const links = screen.getAllByRole('link', { name: title })
    expect(links).toHaveLength(1)
    // The whole card holds that one link and no other.
    expect(within(cardOf(links[0])).getAllByRole('link')).toHaveLength(1)
  }

  const images = thumbnails()
  expect(images).toHaveLength(26)
  for (const image of images) expect(image).toHaveAttribute('alt', '')
})

it('C12 renders a title that looks like HTML as text, and adds no image to the page', async () => {
  const markup = '<img src=x onerror=alert(1)>'

  // The images of the page with the real titles, as the baseline.
  const first = renderApp()
  await cardsLoaded()
  const imagesBefore = document.querySelectorAll('img').length
  first.unmount()

  server.use(
    http.get(POSTS_URL, () =>
      HttpResponse.json(
        rawPosts.map((post, index) =>
          index === 0 ? { ...post, id: 'no-written-text', title: markup } : post,
        ),
      ),
    ),
  )
  renderApp()

  const link = await screen.findByRole('link', { name: markup })
  expect(link).toHaveTextContent(markup)
  expect(document.querySelectorAll('img')).toHaveLength(imagesBefore)
  expect(document.querySelector('img[src="x"]')).toBeNull()
  expect(document.querySelector('[onerror]')).toBeNull()
})

it('C13 swaps a card image that fails to load for a block in the same place', async () => {
  renderApp()
  await cardsLoaded()

  const [image] = thumbnails()
  const link = screen.getAllByRole('link', { name: API_ORDER[0] })[0]
  const card = cardOf(link)
  // The child of the card that holds the image, however deep the image sits.
  let slot: Element = image
  while (slot.parentElement !== card) slot = slot.parentElement as Element
  const position = Array.from(card.children).indexOf(slot)
  const childCount = card.children.length

  fireEvent.error(image)

  expect(image).not.toBeInTheDocument()
  expect(thumbnails()).toHaveLength(25)
  expect(card.querySelector('img')).toBeNull()
  // Same place, same number of children: a block took the image's turn, and it
  // is not the text of the card.
  expect(card.children).toHaveLength(childCount)
  expect(card.children[position]).not.toContainElement(link)
  expect(cardLinks()).toHaveLength(26)
})

it('C19 reads the query string on load and writes what is typed back to it', async () => {
  const user = userEvent.setup()
  const { location } = renderApp('/?q=emily&order=oldest')

  await cardsLoaded(6)
  // Emily Davis wrote the first six posts, and Oldest inverts the API order.
  expect(cardTitles()).toEqual(API_ORDER.slice(0, 6).reverse())
  const search = screen.getByRole('searchbox', { name: 'Search' })
  expect(search).toHaveValue('emily')
  expect(screen.getByRole('button', { name: 'Oldest first' })).toBeInTheDocument()

  await user.type(search, 'x')

  await waitFor(() => expect(location().search).toBe('?q=emilyx&order=oldest'))
})

it('C20 does not render the cards again when the mobile search panel opens and closes, and keeps the grid mounted under it', async () => {
  setViewport('mobile')
  const user = userEvent.setup()
  cardRenders.calls = 0
  renderApp()
  await cardsLoaded()
  // Let anything that follows the first render settle before counting.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  const afterFirstRender = cardRenders.calls
  // The spy is in the way of the real cards: one call per card at least.
  expect(afterFirstRender).toBeGreaterThanOrEqual(26)

  await user.click(screen.getByRole('button', { name: 'Search' }))
  const panel = screen.getByRole('dialog', { name: 'Search' })

  // The grid is still there under the panel, and the page can not reach it.
  expect(mountedCardLinks()).toHaveLength(26)
  expect(mountedCardLinks()[0].closest('[inert]')).not.toBeNull()
  expect(panel.closest('[inert]')).toBeNull()

  await user.click(within(panel).getByRole('button', { name: 'Close search' }))
  expect(screen.queryByRole('dialog', { name: 'Search' })).not.toBeInTheDocument()
  expect(cardLinks()).toHaveLength(26)
  expect(cardLinks()[0].closest('[inert]')).toBeNull()

  // Opening and closing the panel did not call PostCard again.
  expect(cardRenders.calls).toBe(afterFirstRender)
})
