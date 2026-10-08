import type { Page } from '@playwright/test'
import { expect, test as base } from './fixtures'
import type { ApiPost } from './fixtures'

// The Supabase project of the e2e run. playwright.config.ts builds the app
// with this address in VITE_SUPABASE_URL; the specs answer it here, so the
// suite never touches a real database.

export const SUPABASE_HOST = 'e2e.supabase.test'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
}

export interface Row {
  id: string
  post_id: string
  user_id: string
  display_name: string
  body: string
  created_at: string
}

export interface Project {
  comments: Row[]
  /** 200 answers; 503 is a database that is down; 0 aborts the request. */
  readStatus: number
}

const base64url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url')

/** Answers the auth and the comments endpoints of the mocked project. */
export async function mockSupabase(page: Page, project: Project = { comments: [], readStatus: 200 }) {
  await page.route(
    (url) => url.hostname === SUPABASE_HOST,
    async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })

      if (url.pathname === '/auth/v1/signup') {
        const id = '00000000-0000-4000-8000-000000000001'
        const token = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({
          sub: id,
          role: 'authenticated',
          is_anonymous: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
        })}.signature`
        return route.fulfill({
          json: {
            access_token: token,
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: 'refresh',
            user: {
              id,
              aud: 'authenticated',
              role: 'authenticated',
              email: '',
              phone: '',
              is_anonymous: true,
              app_metadata: {},
              user_metadata: (request.postDataJSON() as { data?: object }).data ?? {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          headers: CORS,
        })
      }

      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS })

      if (url.pathname === '/rest/v1/comments') {
        if (request.method() === 'GET') {
          if (project.readStatus === 0) return route.abort()
          if (project.readStatus !== 200) {
            return route.fulfill({ status: project.readStatus, json: { message: 'unavailable' }, headers: CORS })
          }
          const postId = url.searchParams.get('post_id')?.replace(/^eq\./, '')
          return route.fulfill({
            json: project.comments.filter((comment) => !postId || comment.post_id === postId),
            headers: CORS,
          })
        }
        if (request.method() === 'POST') {
          const sent = request.postDataJSON() as Record<string, string> | Record<string, string>[]
          const body = Array.isArray(sent) ? sent[0] : sent
          const created: Row = {
            id: `new-${project.comments.length + 1}`,
            post_id: body.post_id,
            user_id: '00000000-0000-4000-8000-000000000001',
            display_name: body.display_name,
            body: body.body,
            created_at: new Date().toISOString(),
          }
          project.comments.unshift(created)
          return route.fulfill({ status: 201, json: [created], headers: CORS })
        }
        if (request.method() === 'DELETE') return route.fulfill({ status: 204, headers: CORS })
      }
      return route.fulfill({ status: 404, json: { message: 'not mocked' }, headers: CORS })
    },
  )
  return project
}

/**
 * Like the shared test, except that the console errors the browser logs for a
 * request the specs fail on purpose (a database that is down, an aborted
 * request) are not a reason to fail. Page errors and every other console error
 * still are.
 */
export const test = base.extend<{ post: ApiPost; noPageErrors: void }>({
  post: async ({ posts }, use) => {
    await use(posts[1])
  },
  noPageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => {
        errors.push(`page error: ${error.message}`)
      })
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        if (/Failed to load resource|net::ERR_/i.test(message.text())) return
        errors.push(`console error: ${message.text()}`)
      })
      await use()
      expect(errors, 'page and console errors').toEqual([])
    },
    // The base fixture is automatic; the override says so again.
    { auto: true } as unknown as { scope: 'test' },
  ],
})
