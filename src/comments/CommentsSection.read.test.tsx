import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONTRACT,
  OTHER_POST,
  POST,
  openForm,
  renderPost,
  text,
  titleFor,
} from '../test/commentsPage'
import { en, es } from '../test/dictionaries'
import { renderLocalized } from '../test/renderLocalized'
import { installSupabase, row, watchRequests } from '../test/supabaseMock'
import type { Locale } from '../i18n/locale'

afterEach(() => {
  vi.unstubAllEnvs()
})

const mine = (body: string, createdAt: string) =>
  row({ post_id: POST.id, body, created_at: createdAt })

describe('reading the comments of a post', () => {
  it('S8 the request asks for the comments of the post, newest first, at most 100, and only those show', async () => {
    const mock = installSupabase([
      mine('Older comment', '2026-10-01T10:00:00.000Z'),
      mine('Newest comment', '2026-10-03T10:00:00.000Z'),
      row({ post_id: OTHER_POST.id, body: 'Comment of another post' }),
    ])
    renderPost()

    expect(await screen.findByText('Newest comment')).toBeInTheDocument()
    expect(screen.getByText('Older comment')).toBeInTheDocument()
    expect(screen.queryByText('Comment of another post')).not.toBeInTheDocument()

    const [read] = mock.reads
    expect(read.searchParams.get('post_id')).toBe(`eq.${POST.id}`)
    expect(read.searchParams.get('order')).toBe('created_at.desc')
    expect(read.searchParams.get('limit')).toBe('100')
    const order = screen.getAllByText(/^(Newest|Older) comment$/).map((node) => node.textContent)
    expect(order, 'newest first on the page').toEqual(['Newest comment', 'Older comment'])
  })

  for (const [label, status] of [
    ['a 503', 503],
    ['a network error', 0],
  ] as const) {
    it(`S12 the database answering with ${label} shows the message with Try again, the post stays readable and the retry reloads`, async () => {
    const mock = installSupabase([mine('Back again', '2026-10-01T10:00:00.000Z')])
    mock.readStatus = status
    renderPost()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Comments are unavailable right now')
    expect(screen.getByRole('heading', { level: 1, name: POST.title })).toBeInTheDocument()

    mock.readStatus = 200
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Back again')).toBeInTheDocument()
    expect(screen.queryByText('Comments are unavailable right now')).not.toBeInTheDocument()
    })
  }

  it('S13 without the environment variables the same message shows and nothing is requested from Supabase', async () => {
    installSupabase()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const requests = watchRequests()
    renderPost()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Comments are unavailable right now')
    expect(screen.getByRole('heading', { level: 1, name: POST.title })).toBeInTheDocument()
    await new Promise((done) => setTimeout(done, 200))
    requests.stop()
    expect(requests.urls, 'requests to anything but the posts API').toEqual([])
  })

  it('S16 a body with markup shows as text and keeps its line breaks', async () => {
    const body = '<img src=x onerror=alert(1)>\nsecond line'
    installSupabase([mine(body, '2026-10-02T10:00:00.000Z')])
    renderPost()

    const node = await screen.findByText((_content, element) => element?.textContent === body && element.children.length === 0)
    expect(node.textContent, 'the body as text, with its newline').toBe(body)
    expect(document.querySelector('img[src="x"]'), 'no image was created from the body').toBeNull()
    expect(document.querySelector('[onerror]'), 'no handler attribute').toBeNull()

    const folder = resolve(process.cwd(), 'src/comments')
    const styles = readdirSync(folder)
      .filter((file) => file.endsWith('.css'))
      .map((file) => readFileSync(resolve(folder, file), 'utf8'))
      .join('\n')
    expect(styles, 'line breaks are kept by the style').toMatch(/white-space:\s*pre-wrap/)
  })

  it('S17 the section says when it is loading and when it is empty', async () => {
    const mock = installSupabase()
    mock.readDelayMs = 400
    renderPost()

    expect(await screen.findByText('Loading comments')).toBeInTheDocument()
    expect(await screen.findByText('No comments yet. Be the first.')).toBeInTheDocument()
    expect(screen.queryByText('Loading comments')).not.toBeInTheDocument()
  })

  for (const locale of ['en', 'es'] as Locale[]) {
    it(`S17 the dictionary of ${locale} has every key of the section and the Spanish text is not the English one`, () => {
    for (const [key, english] of Object.entries(CONTRACT)) {
      expect(en[key], `${key} in English`).toBe(english)
      expect(text(locale)[key], `${key} in ${locale}`).toBeTypeOf('string')
      if (locale === 'es') expect(es[key], `${key} translated`).not.toBe(english)
    }
    })
  }

  for (const locale of ['en', 'es'] as Locale[]) {
    for (const count of [0, 1, 2]) {
      it(`S17 the title counts ${count} comment(s) in ${locale}`, async () => {
      installSupabase(
        Array.from({ length: count }, (_, index) =>
          mine(`Comment number ${index + 1}`, `2026-10-0${index + 1}T10:00:00.000Z`),
        ),
      )
      renderPost(locale)

      expect(await screen.findByRole('heading', { level: 2, name: titleFor(locale, count) })).toBeInTheDocument()
      if (count === 0) expect(screen.getByText(text(locale)['comments.empty'])).toBeInTheDocument()
      if (locale === 'es') expect(screen.queryByText(en['comments.empty'])).not.toBeInTheDocument()
      })
    }
  }

  it('S20 going to another post shows its comments and drops the draft', async () => {
    const mock = installSupabase([mine('Comment of the first post', '2026-10-02T10:00:00.000Z')])
    const { location } = renderLocalized(`/posts/${POST.id}`)
    const user = userEvent.setup()
    const { field } = await openForm()
    expect(await screen.findByText('Comment of the first post')).toBeInTheDocument()
    await user.type(field, 'A draft that should not travel')

    const next = document.querySelector<HTMLAnchorElement>('main a[href^="/posts/"]')
    if (!next) throw new Error('the post page has no link to another post')
    const nextId = next.getAttribute('href')!.replace('/posts/', '')
    expect(nextId).not.toBe(POST.id)
    mock.comments.push(row({ post_id: nextId, body: 'Comment of the second post' }))
    await user.click(next)

    await waitFor(() => expect(location().pathname).toBe(`/posts/${nextId}`))
    expect(await screen.findByText('Comment of the second post')).toBeInTheDocument()
    expect(screen.queryByText('Comment of the first post')).not.toBeInTheDocument()
    expect(await screen.findByRole('textbox', { name: 'Your comment' })).toHaveValue('')
    expect(mock.reads.at(-1)?.searchParams.get('post_id')).toBe(`eq.${nextId}`)
  })
})
