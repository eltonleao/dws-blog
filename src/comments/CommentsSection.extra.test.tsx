import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST, comment, openForm, renderPost } from '../test/commentsPage'
import { installSupabase, row } from '../test/supabaseMock'
import { getSupabase } from './supabaseClient'
import { ensureVisitor, leaveVisitor } from './visitor'
import type { Locale } from '../i18n/locale'

// Cases the first suites of the comments section do not reach, each one written
// against a change that the first suites let through (see the mutants of
// dentsu-P4-comentarios).

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the comments section, further cases', () => {
  const titles: Array<[Locale, number, string]> = [
    ['en', 0, '0 comments'],
    ['en', 1, '1 comment'],
    ['en', 2, '2 comments'],
    ['es', 0, '0 comentarios'],
    ['es', 1, '1 comentario'],
    ['es', 2, '2 comentarios'],
  ]
  for (const [locale, count, title] of titles) {
    it(`S17 the title reads "${title}" for ${count} comment(s) in ${locale}`, async () => {
      installSupabase(
        Array.from({ length: count }, (_, index) =>
          row({ post_id: POST.id, body: `Comment number ${index + 1}`, created_at: `2026-10-0${index + 1}T10:00:00.000Z` }),
        ),
      )
      renderPost(locale)

      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    })
  }

  it('S15 two submits before the button re-renders send one insert', async () => {
    const mock = installSupabase()
    mock.insertDelayMs = 300
    renderPost()

    const user = userEvent.setup()
    const { field } = await openForm()
    await user.type(field, 'Only once')
    const form = field.closest('form')
    if (!form) throw new Error('the field has no form')
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(field).toHaveValue(''))
    expect(mock.inserts, 'one insert for two submits').toHaveLength(1)
  })

  it('S10 the next visitor never gets the name of the one who left, even when the draw repeats it', async () => {
    installSupabase()
    let draws = 0
    const real = Math.random.bind(Math)
    // Only the draw of the visitor name is scripted: the name drawn first, the
    // same one again, then another.
    vi.spyOn(Math, 'random').mockImplementation(() => {
      if (!new Error().stack?.includes('drawVisitorName')) return real()
      draws += 1
      return draws <= 2 ? 0.5 : 0.9
    })

    const first = await ensureVisitor()
    await leaveVisitor()
    const second = await ensureVisitor()

    expect(first.displayName).toBe('Visitor 5500')
    expect(second.displayName, 'another name').not.toBe(first.displayName)
    expect(second.displayName).toMatch(/^Visitor \d{4}$/)
  })

  it('S11 a refused sign-in sends no insert and creates no visitor', async () => {
    const mock = installSupabase()
    mock.signupStatus = 422
    renderPost()

    const { field } = await comment('Will not go')
    expect(await screen.findByText('Could not start your visitor session')).toBeInTheDocument()
    expect(field).toHaveValue('Will not go')
    expect(mock.inserts, 'no insert after the failed sign-in').toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument()
  })
})

describe('the Supabase client of the comments', () => {
  const cases: Array<[string, string, string, boolean]> = [
    ['both variables empty', '', '', false],
    ['only the address', 'https://example.supabase.test', '', false],
    ['only the key', '', 'public-key', false],
    ['both variables set', 'https://example.supabase.test', 'public-key', true],
  ]
  for (const [label, url, key, configured] of cases) {
    it(`S13 getSupabase with ${label} ${configured ? 'returns a client' : 'returns null'}`, async () => {
      vi.stubEnv('VITE_SUPABASE_URL', url)
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', key)
      // A rejection is caught so that a wrong answer fails as an assertion.
      const client = await getSupabase().catch((error: unknown) => error)
      if (configured) expect(client).not.toBeNull()
      else expect(client).toBeNull()
    })
  }
})
