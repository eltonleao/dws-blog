import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeStore } from '../../app/store'
import type { ContentMap } from '../../content/parseContent'
import type { Locale } from '../../i18n/locale'
import rawPosts from '../../test/fixtures/posts.json'
import { renderLocalized } from '../../test/renderLocalized'
import { POSTS_URL, server } from '../../test/server'
import { usePosts } from './usePosts'

// The two content chunks are replaced by loaders the test controls: that is the
// seam the design gives (contentLoaders in src/content/loadContent.ts).
const loaders = vi.hoisted(() => ({ en: vi.fn(), es: vi.fn() }))
vi.mock('../../content/loadContent', () => ({ contentLoaders: loaders }))

const FIRST = rawPosts[0]
const SECOND = rawPosts[1]

// Written text for every post of the API but the ones in `skip`, distinct per language.
function contentOf(locale: Locale, skip: string[] = []): ContentMap {
  const map: ContentMap = {}
  for (const post of rawPosts) {
    if (skip.includes(post.id)) continue
    map[post.id] = {
      title: `${locale === 'en' ? 'Written' : 'Escrito'} ${post.title}`,
      content: [1, 2, 3, 4]
        .map((n) => `${locale === 'en' ? 'English' : 'Spanish'} paragraph ${n} of ${post.title}.`)
        .join('\n\n'),
    }
  }
  return map
}

const titleOf = (locale: Locale, title: string) => `${locale === 'en' ? 'Written' : 'Escrito'} ${title}`
const paragraphOf = (locale: Locale, title: string, n: number) =>
  `${locale === 'en' ? 'English' : 'Spanish'} paragraph ${n} of ${title}.`

const cardLinks = () => screen.queryAllByRole('link').filter((link) => (link.getAttribute('href') ?? '').startsWith('/posts/'))

function wrapperFor(locale: Locale) {
  const store = makeStore({ locale })
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>
  return { store, wrapper }
}

beforeEach(() => {
  loaders.en.mockReset()
  loaders.es.mockReset()
  loaders.en.mockImplementation(async () => contentOf('en'))
  loaders.es.mockImplementation(async () => contentOf('es'))
  localStorage.clear()
})

describe('the list and the post with the written content', () => {
  it('K8 shows each card with the written title and first paragraph in English', async () => {
    renderLocalized('/', { locale: 'en' })

    expect(await screen.findByRole('link', { name: titleOf('en', FIRST.title) })).toBeInTheDocument()
    expect(screen.getByText(paragraphOf('en', FIRST.title, 1))).toBeInTheDocument()
    expect(screen.queryByText(/Lorem ipsum/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: FIRST.title })).not.toBeInTheDocument()
  })

  it('K8 shows each card with the title and first paragraph written in Spanish, and asks for the Spanish chunk only', async () => {
    renderLocalized('/', { locale: 'es' })

    expect(await screen.findByRole('link', { name: titleOf('es', FIRST.title) })).toBeInTheDocument()
    expect(screen.getByText(paragraphOf('es', FIRST.title, 1))).toBeInTheDocument()
    expect(screen.queryByText(paragraphOf('en', FIRST.title, 1))).not.toBeInTheDocument()
    expect(loaders.en).not.toHaveBeenCalled()
  })

  it('K8 shows the post page in Spanish with the h1, the page title and all four paragraphs', async () => {
    renderLocalized(`/posts/${SECOND.id}`, { locale: 'es' })

    expect(await screen.findByRole('heading', { level: 1, name: titleOf('es', SECOND.title) })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toContain(titleOf('es', SECOND.title)))
    expect(document.title).not.toContain(`Written ${SECOND.title}`)
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByText(paragraphOf('es', SECOND.title, n))).toBeInTheDocument()
    }
    expect(screen.queryByText(/Lorem ipsum/)).not.toBeInTheDocument()
  })

  it('K8 changes the list and the post when the language is switched, without a reload', async () => {
    const user = userEvent.setup()
    renderLocalized(`/posts/${SECOND.id}`, { locale: 'en' })

    expect(await screen.findByRole('heading', { level: 1, name: titleOf('en', SECOND.title) })).toBeInTheDocument()
    expect(screen.getByText(paragraphOf('en', SECOND.title, 2))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Español' }))

    expect(await screen.findByRole('heading', { level: 1, name: titleOf('es', SECOND.title) })).toBeInTheDocument()
    expect(screen.getByText(paragraphOf('es', SECOND.title, 2))).toBeInTheDocument()
    expect(screen.queryByText(paragraphOf('en', SECOND.title, 2))).not.toBeInTheDocument()
  })
})

describe('usePosts', () => {
  it('K8 waits for the posts and the content before it hands the list over, so the lorem never shows', async () => {
    let release: (map: ContentMap) => void = () => {}
    loaders.en.mockImplementation(() => new Promise<ContentMap>((resolve) => (release = resolve)))
    const { wrapper } = wrapperFor('en')

    const { result } = renderHook(() => usePosts(), { wrapper })

    // The posts of the API arrive first (the handler answers at once); the content is still pending.
    await waitFor(() => expect(loaders.en).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(result.current.posts).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isError).toBe(false)

    await act(async () => release(contentOf('en')))

    await waitFor(() => expect(result.current.posts).toHaveLength(26))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.posts?.[0].title).toBe(titleOf('en', FIRST.title))
  })

  it('K8 localizes the posts to the language of the store before any page sees them', async () => {
    const { wrapper } = wrapperFor('es')

    const { result } = renderHook(() => usePosts(), { wrapper })

    await waitFor(() => expect(result.current.posts).toHaveLength(26))
    expect(result.current.posts?.[0].title).toBe(titleOf('es', FIRST.title))
    expect(result.current.posts?.[0].content).toContain(paragraphOf('es', FIRST.title, 1))
    expect(result.current.posts?.[0].id).toBe(FIRST.id)
  })

  it('K4 hands over the API post as it is for an id with no written text, and the other posts localized', async () => {
    const { wrapper } = wrapperFor('en')
    loaders.en.mockImplementation(async () => contentOf('en', [SECOND.id]))

    const { result } = renderHook(() => usePosts(), { wrapper })

    await waitFor(() => expect(result.current.posts).toHaveLength(26))
    const second = result.current.posts?.find((post) => post.id === SECOND.id)
    expect(second?.title).toBe(SECOND.title)
    expect(second?.content).toBe(SECOND.content)
    expect(result.current.posts?.find((post) => post.id === FIRST.id)?.title).toBe(titleOf('en', FIRST.title))
  })

  it('K5 hands over the posts of the API when the content chunk fails, with no error', async () => {
    loaders.en.mockRejectedValue(new Error('Failed to fetch dynamically imported module'))
    const { wrapper } = wrapperFor('en')

    const { result } = renderHook(() => usePosts(), { wrapper })

    await waitFor(() => expect(result.current.posts).toHaveLength(26))
    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.posts?.[0].title).toBe(FIRST.title)
    expect(result.current.posts?.[0].content).toBe(FIRST.content)
  })

  it('K5 still reports an error when the API itself fails', async () => {
    server.use(http.get(POSTS_URL, () => new HttpResponse(null, { status: 500 })))
    const { wrapper } = wrapperFor('en')

    const { result } = renderHook(() => usePosts(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.posts).toBeUndefined()
  })
})

describe('a new post and a failing chunk on the pages', () => {
  it('K4 shows a 27th post of the API with its own title and body, next to the written ones', async () => {
    const extra = {
      ...SECOND,
      id: '00000000-0000-4000-8000-00000000abcd',
      title: 'A post nobody wrote text for',
      content: 'Body that only the API has.\n\nSecond API paragraph.',
    }
    server.use(http.get(POSTS_URL, () => HttpResponse.json([...rawPosts, extra])))

    renderLocalized('/', { locale: 'en' })

    expect(await screen.findByRole('link', { name: 'A post nobody wrote text for' })).toBeInTheDocument()
    expect(screen.getByText('Body that only the API has.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: titleOf('en', FIRST.title) })).toBeInTheDocument()
    expect(cardLinks()).toHaveLength(27)
  })

  it('K4 opens the page of a post that has no written text, with the title and body of the API', async () => {
    const extra = {
      ...SECOND,
      id: '00000000-0000-4000-8000-00000000abcd',
      title: 'A post nobody wrote text for',
      content: 'Body that only the API has.\n\nSecond API paragraph.',
    }
    server.use(http.get(POSTS_URL, () => HttpResponse.json([...rawPosts, extra])))

    renderLocalized(`/posts/${extra.id}`, { locale: 'es' })

    expect(await screen.findByRole('heading', { level: 1, name: extra.title })).toBeInTheDocument()
    expect(screen.getByText('Body that only the API has.')).toBeInTheDocument()
    expect(screen.getByText('Second API paragraph.')).toBeInTheDocument()
  })

  it('K5 keeps the list and the post alive with the text of the API when the chunk fails, and asks again when the language changes', async () => {
    const user = userEvent.setup()
    loaders.en.mockRejectedValue(new Error('Failed to fetch dynamically imported module'))
    renderLocalized('/', { locale: 'en' })

    expect(await screen.findByRole('link', { name: FIRST.title })).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    expect(cardLinks()).toHaveLength(26)
    expect(loaders.es).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Español' }))

    expect(await screen.findByRole('link', { name: titleOf('es', FIRST.title) })).toBeInTheDocument()
    expect(loaders.es).toHaveBeenCalledTimes(1)

    // The chunk of English answers this time, so asking again is what shows the written text.
    loaders.en.mockImplementation(async () => contentOf('en'))
    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(await screen.findByRole('link', { name: titleOf('en', FIRST.title) })).toBeInTheDocument()
    expect(loaders.en).toHaveBeenCalledTimes(2)
  })

  it('K5 shows the post page with the text of the API when the chunk fails', async () => {
    loaders.es.mockRejectedValue(new Error('Failed to fetch dynamically imported module'))
    renderLocalized(`/posts/${SECOND.id}`, { locale: 'es' })

    const title = await screen.findByRole('heading', { level: 1, name: SECOND.title })
    expect(title).toBeInTheDocument()
    // The 26 posts share their first paragraph, so Latest articles repeats it: read inside the post.
    const article = title.closest('article') as HTMLElement
    expect(within(article).getByText(SECOND.content.split(/\n\s*\n/)[0].trim())).toBeInTheDocument()
  })

  it('K7 paints a body with a script tag and an image tag as plain text and never as HTML', async () => {
    const script = '<script>window.__pwned = true</script>'
    const image = '<img src="x" onerror="window.__pwned = true">'
    loaders.en.mockImplementation(async () => ({
      ...contentOf('en'),
      [SECOND.id]: { title: 'Markup in the body', content: `${script}\n\n${image}\n\nA plain paragraph.` },
    }))

    renderLocalized(`/posts/${SECOND.id}`, { locale: 'en' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Markup in the body' })).toBeInTheDocument()
    expect(screen.getByText(script)).toBeInTheDocument()
    expect(screen.getByText(image)).toBeInTheDocument()
    expect(document.querySelector('main script')).toBeNull()
    expect(document.querySelector('[onerror]')).toBeNull()
    expect(document.querySelectorAll('img[src="x"]')).toHaveLength(0)
  })
})
