import { http, HttpResponse, delay } from 'msw'
import { vi } from 'vitest'
import { server } from './server'

// A stand-in for the Supabase project, answered by msw at the addresses the
// client calls: /auth/v1/signup and /auth/v1/logout for the anonymous visitor
// and /rest/v1/comments for the comments. It keeps the table in memory and
// records what the app sent, so a test reads the requests and not the code.

export const SUPABASE_URL = 'https://abc.supabase.co'
export const SUPABASE_KEY = 'test-anon-key'
export const COMMENTS_URL = `${SUPABASE_URL}/rest/v1/comments`

export interface CommentRow {
  id: string
  post_id: string
  user_id: string
  display_name: string
  body: string
  created_at: string
}

export interface SupabaseState {
  /** The table, newest first. */
  comments: CommentRow[]
  reads: URL[]
  signups: { data?: { display_name?: string } }[]
  inserts: { body: Record<string, unknown>; authorization: string | null }[]
  deletes: URL[]
  logouts: number
  /** The access token each signup handed out, in order. */
  tokens: string[]
  /** Status of the next answers: 0 is a network error. */
  readStatus: number
  signupStatus: number
  insertStatus: number
  deleteStatus: number
  /** Milliseconds the answer waits, to see the loading state or a double click. */
  readDelayMs: number
  insertDelayMs: number
  /** When set, the delete is not answered until this promise settles. */
  deleteGate?: Promise<void>
}

const base64url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

function jwtFor(sub: string): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' })
  const payload = base64url({
    sub,
    role: 'authenticated',
    is_anonymous: true,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
  return `${header}.${payload}.signature`
}

function subOf(authorization: string | null): string {
  const token = authorization?.replace(/^Bearer /, '') ?? ''
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return (JSON.parse(atob(payload)) as { sub: string }).sub
  } catch {
    return ''
  }
}

const userId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** The PostgREST error body the server sends. */
export const rlsError = {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "comments"',
}

export function row(overrides: Partial<CommentRow> & Pick<CommentRow, 'post_id' | 'body'>): CommentRow {
  return {
    id: `c-${Math.random().toString(36).slice(2, 10)}`,
    user_id: userId(900),
    display_name: 'Visitor 0001',
    created_at: '2026-10-01T12:00:00.000Z',
    ...overrides,
  }
}

/**
 * Points the app at the mocked project (the two variables the client reads)
 * and installs the handlers. Call it in the test, before rendering.
 */
export function installSupabase(comments: CommentRow[] = []): SupabaseState {
  vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_KEY)
  localStorage.clear()

  const state: SupabaseState = {
    comments: [...comments],
    reads: [],
    signups: [],
    inserts: [],
    deletes: [],
    logouts: 0,
    tokens: [],
    readStatus: 200,
    signupStatus: 200,
    insertStatus: 201,
    deleteStatus: 204,
    readDelayMs: 0,
    insertDelayMs: 0,
  }
  let inserted = 0

  server.use(
    http.post(`${SUPABASE_URL}/auth/v1/signup`, async ({ request }) => {
      const body = (await request.json()) as SupabaseState['signups'][number]
      state.signups.push(body)
      if (state.signupStatus !== 200) {
        return HttpResponse.json(
          { code: state.signupStatus, error_code: 'anonymous_provider_disabled', msg: 'Anonymous sign-ins are disabled' },
          { status: state.signupStatus },
        )
      }
      const id = userId(state.signups.length)
      const token = jwtFor(id)
      state.tokens.push(token)
      return HttpResponse.json({
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `refresh-${state.signups.length}`,
        user: {
          id,
          aud: 'authenticated',
          role: 'authenticated',
          email: '',
          phone: '',
          is_anonymous: true,
          app_metadata: {},
          user_metadata: body.data ?? {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    }),

    http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
      state.logouts += 1
      return new HttpResponse(null, { status: 204 })
    }),

    http.get(COMMENTS_URL, async ({ request }) => {
      const url = new URL(request.url)
      state.reads.push(url)
      if (state.readDelayMs) await delay(state.readDelayMs)
      if (state.readStatus === 0) return HttpResponse.error()
      if (state.readStatus !== 200) {
        return HttpResponse.json({ message: 'unavailable' }, { status: state.readStatus })
      }
      const postId = url.searchParams.get('post_id')?.replace(/^eq\./, '')
      let rows = state.comments.filter((comment) => !postId || comment.post_id === postId)
      rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))
      if (url.searchParams.get('order') !== 'created_at.desc') rows.reverse()
      const limit = Number(url.searchParams.get('limit') ?? rows.length)
      return HttpResponse.json(rows.slice(0, limit))
    }),

    http.post(COMMENTS_URL, async ({ request }) => {
      const parsed = (await request.json()) as Record<string, unknown> | Record<string, unknown>[]
      const body = Array.isArray(parsed) ? parsed[0] : parsed
      const authorization = request.headers.get('authorization')
      state.inserts.push({ body, authorization })
      if (state.insertDelayMs) await delay(state.insertDelayMs)
      if (state.insertStatus === 0) return HttpResponse.error()
      if (state.insertStatus === 403) return HttpResponse.json(rlsError, { status: 403 })
      if (state.insertStatus >= 400) {
        return HttpResponse.json({ message: 'unavailable' }, { status: state.insertStatus })
      }
      inserted += 1
      const created = row({
        id: `new-${inserted}`,
        post_id: String(body.post_id),
        user_id: subOf(authorization),
        display_name: String(body.display_name),
        body: String(body.body),
        created_at: new Date(Date.now() + inserted).toISOString(),
      })
      state.comments.unshift(created)
      const prefer = request.headers.get('prefer') ?? ''
      if (!prefer.includes('return=representation')) return new HttpResponse(null, { status: 201 })
      const single = (request.headers.get('accept') ?? '').includes('pgrst.object')
      return HttpResponse.json(single ? created : [created], { status: 201 })
    }),

    http.delete(COMMENTS_URL, async ({ request }) => {
      const url = new URL(request.url)
      state.deletes.push(url)
      if (state.deleteGate) await state.deleteGate
      if (state.deleteStatus >= 400) {
        return HttpResponse.json({ message: 'unavailable' }, { status: state.deleteStatus })
      }
      const id = url.searchParams.get('id')?.replace(/^eq\./, '')
      state.comments = state.comments.filter((comment) => comment.id !== id)
      return new HttpResponse(null, { status: 204 })
    }),
  )

  return state
}

/** The addresses of every request the page makes that is not the posts API. */
export function watchRequests(): { urls: string[]; stop: () => void } {
  const urls: string[] = []
  const listener = ({ request }: { request: Request }) => {
    if (!request.url.startsWith('https://tech-test-backend.dwsbrazil.io')) urls.push(request.url)
  }
  server.events.on('request:start', listener)
  return { urls, stop: () => server.events.removeListener('request:start', listener) }
}
