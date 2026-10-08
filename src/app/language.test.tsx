import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readStoredLocale } from '../i18n/locale'
import rawPosts from '../test/fixtures/posts.json'
import { spanishOf } from '../test/dictionaries'
import { renderLocalized } from '../test/renderLocalized'

const KEY = 'dws-blog:locale'

// The page of an unknown address needs no network and says a plain sentence in
// its title, which makes it the smallest screen to watch the language on.
const ROUTE = '/nao-existe'
const ENGLISH_TITLE = 'Post not found'

const technologyIds = rawPosts
  .filter((post) => post.categories.some((category) => category.name === 'Technology'))
  .map((post) => post.id)

const title = (name: string) => screen.queryByRole('heading', { level: 1, name })
const spanishButton = () => screen.getByRole('button', { name: 'Español' })
const englishButton = () => screen.getByRole('button', { name: 'English' })

// The cards of the list: the links to a post.
const cardHrefs = () =>
  screen
    .queryAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href.startsWith('/posts/'))

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.lang = ''
})

it('L3 switches the interface to Spanish on a click, writes it to html lang and stores the choice, and English undoes it', async () => {
  const user = userEvent.setup()
  const spanishTitle = spanishOf(ENGLISH_TITLE)
  expect(spanishTitle, 'the text differs between the languages').not.toBe(ENGLISH_TITLE)
  renderLocalized(ROUTE)

  expect(await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'en')

  await user.click(spanishButton())

  expect(await screen.findByRole('heading', { level: 1, name: spanishTitle })).toBeInTheDocument()
  expect(title(ENGLISH_TITLE)).not.toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'es')
  expect(localStorage.getItem(KEY)).toBe('es')

  await user.click(englishButton())

  expect(await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'en')
  expect(localStorage.getItem(KEY)).toBe('en')
})

it('L3 keeps the choice after a reload: the store started from what main.tsx reads is in Spanish', async () => {
  const user = userEvent.setup()
  const first = renderLocalized(ROUTE)
  await user.click(await screen.findByRole('button', { name: 'Español' }))
  expect(localStorage.getItem(KEY)).toBe('es')
  first.unmount()

  renderLocalized(ROUTE, { locale: readStoredLocale() })

  expect(await screen.findByRole('heading', { level: 1, name: spanishOf(ENGLISH_TITLE) })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'es')
  expect(spanishButton()).toHaveAttribute('aria-pressed', 'true')
})

it('L3 still switches the language for the session when the storage throws', async () => {
  const user = userEvent.setup()
  const blocked = () => {
    throw new DOMException('The storage is blocked', 'SecurityError')
  }
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
  renderLocalized(ROUTE)

  await user.click(await screen.findByRole('button', { name: 'Español' }))

  expect(await screen.findByRole('heading', { level: 1, name: spanishOf(ENGLISH_TITLE) })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'es')
  expect(spanishButton()).toHaveAttribute('aria-pressed', 'true')
})

it('L4 opens in English on a first visit and in Spanish on the very first render when the store starts in es', async () => {
  const english = renderLocalized(ROUTE)
  expect(await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })).toBeInTheDocument()
  expect(englishButton()).toHaveAttribute('aria-pressed', 'true')
  expect(document.documentElement).toHaveAttribute('lang', 'en')
  english.unmount()

  renderLocalized(ROUTE, { locale: 'es' })

  // No wait: this is what the first paint holds. English never shows.
  expect(title(spanishOf(ENGLISH_TITLE))).toBeInTheDocument()
  expect(title(ENGLISH_TITLE)).not.toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'es')
  expect(spanishButton()).toHaveAttribute('aria-pressed', 'true')
})

it('L7 filters the same posts with ?category=Technology in English and in Spanish, and the label comes out translated', async () => {
  expect(technologyIds.length, 'the snapshot has Technology posts').toBeGreaterThan(0)
  const expected = technologyIds.map((id) => `/posts/${id}`).sort()

  const english = renderLocalized('/?category=Technology')
  await waitFor(() => expect(cardHrefs()).toHaveLength(expected.length))
  expect([...cardHrefs()].sort()).toEqual(expected)
  expect(screen.getByRole('button', { name: 'Technology', pressed: true })).toBeInTheDocument()
  english.unmount()

  renderLocalized('/?category=Technology', { locale: 'es' })
  await waitFor(() => expect(cardHrefs()).toHaveLength(expected.length))
  expect([...cardHrefs()].sort()).toEqual(expected)
  expect(screen.getByRole('button', { name: 'Tecnología', pressed: true })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Technology' })).not.toBeInTheDocument()
})

it('L7 keeps the filters, the order and the search, and the address, when the language changes', async () => {
  const user = userEvent.setup()
  const route = '/?q=tech&category=Technology&order=oldest'
  const app = renderLocalized(route)
  await waitFor(() => expect(cardHrefs().length).toBeGreaterThan(0))
  const searchBefore = app.location().search
  expect(searchBefore, 'the address carries the state').toContain('category=Technology')
  expect(screen.getByRole('searchbox')).toHaveValue('tech')
  expect(screen.getByRole('button', { name: 'Oldest first' })).toBeInTheDocument()

  await user.click(spanishButton())

  const sidebar = await screen.findByRole('button', { name: 'Tecnología' })
  expect(sidebar).toHaveAttribute('aria-pressed', 'true')
  expect(app.location().search, 'the address is the same').toBe(searchBefore)
  expect(screen.getByRole('searchbox'), 'the search keeps its text').toHaveValue('tech')
  expect(
    screen.getByRole('button', { name: spanishOf('Oldest first') }),
    'the order is still the oldest first',
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Oldest first' })).not.toBeInTheDocument()
  expect(cardHrefs().length, 'the list keeps its cards').toBeGreaterThan(0)
})
