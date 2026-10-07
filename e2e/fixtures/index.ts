import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test as base } from '@playwright/test'

// The e2e suite never touches the network: the API and the S3 images are
// answered here, and any other request to the outside world is refused.

const API_ORIGIN = 'https://tech-test-backend.dwsbrazil.io'
const IMAGE_HOST = 'dws-tech-test-assets.s3.amazonaws.com'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

// The page is served from localhost, so the mocked answers need CORS headers
// just like the real servers send them.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
}

const postsFile = fileURLToPath(
  new URL('../../src/test/fixtures/posts.json', import.meta.url),
)
const imageFile = fileURLToPath(new URL('./image.png', import.meta.url))

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
} as const

/** The part of an API post the specs read; the snapshot has more fields. */
export interface ApiPost {
  id: string
  title: string
  author: { id: string; name: string }
  categories: { id: string; name: string }[]
}

interface Fixtures {
  /** The API snapshot of 06/10/2026, exactly as the mocked endpoint serves it. */
  posts: ApiPost[]
  /** Automatic: answers the API and the image host locally. */
  mockedNetwork: void
  /** Automatic: fails the test on any page error or console error. */
  noPageErrors: void
}

// In a fixture, `use` is Playwright's callback, not a React hook, and the first
// argument has to be a destructuring pattern (empty when it needs nothing):
// Playwright reads the fixture's dependencies from it.
export const test = base.extend<Fixtures>({
  posts: async ({}, use) => {
    await use(JSON.parse(readFileSync(postsFile, 'utf8')) as ApiPost[])
  },

  mockedNetwork: [
    async ({ page, posts }, use) => {
      // The route registered last wins, so this catch-all goes first: it only
      // gets what the two routes below do not answer.
      await page.route(
        (url) =>
          /^https?:$/.test(url.protocol) && !LOCAL_HOSTS.has(url.hostname),
        (route) => route.abort(),
      )
      await page.route(
        (url) => url.origin === API_ORIGIN && url.pathname === '/posts/',
        (route) =>
          route.request().method() === 'OPTIONS'
            ? route.fulfill({ status: 204, headers: CORS_HEADERS })
            : route.fulfill({ json: posts, headers: CORS_HEADERS }),
      )
      await page.route(
        (url) => url.hostname === IMAGE_HOST,
        (route) =>
          route.fulfill({
            path: imageFile,
            contentType: 'image/png',
            headers: CORS_HEADERS,
          }),
      )
      await use()
    },
    { auto: true },
  ],

  noPageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => {
        errors.push(`page error: ${error.message}`)
      })
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(`console error: ${message.text()}`)
        }
      })
      await use()
      expect(errors, 'page and console errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
