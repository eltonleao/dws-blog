import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import posts from './fixtures/posts.json'

export const API_URL = 'https://tech-test-backend.dwsbrazil.io'
export const POSTS_URL = `${API_URL}/posts/`

// The default answer is the snapshot of the API taken on 06/10/2026. A test
// that needs something else (a 500, an HTML body, no answer at all) replaces
// it with `server.use(...)`.
export const postsHandler = http.get(POSTS_URL, () => HttpResponse.json(posts))

export const server = setupServer(postsHandler)
