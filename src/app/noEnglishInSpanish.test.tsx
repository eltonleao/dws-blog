import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import { en, es, hasPlaceholder, spanishOf } from '../test/dictionaries'
import rawPosts from '../test/fixtures/posts.json'
import { renderLocalized } from '../test/renderLocalized'
import { POSTS_URL, server } from '../test/server'
import { setViewport } from '../test/setup'

// Every string of the English dictionary that the Spanish one says differently,
// and that has no {placeholder} to fill. None of them may be on a screen in
// Spanish: not as text, and not as the name of a control.
const spanishTexts = new Set(Object.values(es))
const ENGLISH_ONLY = [
  ...new Set(
    Object.keys(en)
      .filter((key) => en[key] !== es[key] && !hasPlaceholder(en[key]) && !spanishTexts.has(en[key]))
      .map((key) => en[key]),
  ),
]

const ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'alt']

function englishOnScreen(): string[] {
  const found: string[] = []
  for (const text of ENGLISH_ONLY) {
    if (screen.queryAllByText(text, { exact: true }).length > 0) found.push(`text "${text}"`)
  }
  const labels = Array.from(document.body.querySelectorAll('[aria-label],[placeholder],[title],[alt]'))
    .flatMap((element) => ATTRIBUTES.map((name) => element.getAttribute(name) ?? ''))
    .filter(Boolean)
  for (const label of labels) {
    if (ENGLISH_ONLY.includes(label)) found.push(`attribute "${label}"`)
  }
  return found
}

const POST_ID = rawPosts[0].id

function screenTest(name: string, run: () => Promise<void>) {
  it(`L5 shows no text of the English dictionary on ${name} in Spanish`, async () => {
    expect(ENGLISH_ONLY.length, 'the dictionaries differ in some text').toBeGreaterThan(0)
    await run()
    expect(englishOnScreen()).toEqual([])
  })
}

const cardsLoaded = () =>
  waitFor(() =>
    expect(
      screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/posts/')),
    ).toHaveLength(rawPosts.length),
  )

screenTest('the list, on desktop with the filter sidebar', async () => {
  renderLocalized('/', { locale: 'es' })
  await cardsLoaded()
  expect(screen.getByRole('button', { name: spanishOf('Newest first') })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: spanishOf('Apply filters') })).toBeInTheDocument()
})

screenTest('the list, on mobile with the filter dropdowns', async () => {
  setViewport('mobile')
  renderLocalized('/', { locale: 'es' })
  await cardsLoaded()
  expect(screen.getByRole('button', { name: spanishOf('Newest first') })).toBeInTheDocument()
})

screenTest('the mobile search panel', async () => {
  setViewport('mobile')
  renderLocalized('/', { locale: 'es' })
  await cardsLoaded()
  await userEvent.setup().click(screen.getByRole('button', { name: spanishOf('Search') }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: spanishOf('Close search') })).toBeInTheDocument()
})

screenTest('a search with no result', async () => {
  renderLocalized('/?q=zzzzqq', { locale: 'es' })
  expect(await screen.findByText(spanishOf('No posts found'))).toBeInTheDocument()
  expect(screen.getByRole('button', { name: spanishOf('Clear filters') })).toBeInTheDocument()
})

screenTest('the list while it loads', async () => {
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
  try {
    renderLocalized('/', { locale: 'es' })
    expect(await screen.findByText(spanishOf('Loading posts'))).toBeInTheDocument()
    expect(englishOnScreen()).toEqual([])
  } finally {
    release()
  }
})

screenTest('the list when the API fails', async () => {
  server.use(http.get(POSTS_URL, () => new HttpResponse(null, { status: 500 })))
  renderLocalized('/', { locale: 'es' })
  expect(await screen.findByText(spanishOf('Something went wrong'))).toBeInTheDocument()
  expect(screen.getByRole('button', { name: spanishOf('Try again') })).toBeInTheDocument()
})

screenTest('a post', async () => {
  renderLocalized(`/posts/${POST_ID}`, { locale: 'es' })
  expect(await screen.findByRole('heading', { level: 2, name: spanishOf('Latest articles') })).toBeInTheDocument()
})

screenTest('a post while it loads', async () => {
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
  try {
    renderLocalized(`/posts/${POST_ID}`, { locale: 'es' })
    expect(await screen.findByText(spanishOf('Loading post'))).toBeInTheDocument()
    expect(englishOnScreen()).toEqual([])
  } finally {
    release()
  }
})

screenTest('a post when the API fails', async () => {
  server.use(http.get(POSTS_URL, () => new HttpResponse(null, { status: 500 })))
  renderLocalized(`/posts/${POST_ID}`, { locale: 'es' })
  expect(await screen.findByText(spanishOf('Something went wrong'))).toBeInTheDocument()
  expect(screen.getByRole('button', { name: spanishOf('Try again') })).toBeInTheDocument()
})

screenTest('a post that does not exist', async () => {
  renderLocalized('/posts/00000000-0000-4000-8000-000000000000', { locale: 'es' })
  expect(await screen.findByRole('heading', { level: 1, name: spanishOf('Post not found') })).toBeInTheDocument()
})

screenTest('an address that does not exist', async () => {
  renderLocalized('/nao-existe', { locale: 'es' })
  expect(await screen.findByRole('heading', { level: 1, name: spanishOf('Post not found') })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: spanishOf('See all posts') })).toBeInTheDocument()
})

screenTest('/proof, with the way back', async () => {
  renderLocalized('/proof', { locale: 'es' })
  const footer = await screen.findByRole('contentinfo')
  expect(footer).toHaveTextContent(spanishOf('Back to the blog'))
})
