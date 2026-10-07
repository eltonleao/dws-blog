import { expect, it } from 'vitest'
import { parsePosts } from '../../api/parsePosts'
import rawPosts from '../../test/fixtures/posts.json'
import { makePost } from '../../test/makePost'
import { latestPosts } from './latestPosts'
import type { Post } from './types'

const ids = (posts: Post[]) => posts.map((post) => post.id)

it('D16 returns the 3 newest posts without the current one, and 1 when there are 2 posts in total', () => {
  const posts = parsePosts(rawPosts)

  // The 26 dates are equal, so Newest is the API order.
  expect(ids(latestPosts(posts, posts[0].id))).toEqual([
    posts[1].id,
    posts[2].id,
    posts[3].id,
  ])

  // The current post is among the first three: it leaves before the cut.
  expect(ids(latestPosts(posts, posts[1].id))).toEqual([
    posts[0].id,
    posts[2].id,
    posts[3].id,
  ])

  // Distinct dates, out of order: newest first, never the current one.
  const dated = [
    makePost({ id: 'january', apiIndex: 0, createdAt: '2026-01-01T00:00:00.000Z' }),
    makePost({ id: 'april', apiIndex: 1, createdAt: '2026-04-01T00:00:00.000Z' }),
    makePost({ id: 'february', apiIndex: 2, createdAt: '2026-02-01T00:00:00.000Z' }),
    makePost({ id: 'may', apiIndex: 3, createdAt: '2026-05-01T00:00:00.000Z' }),
    makePost({ id: 'march', apiIndex: 4, createdAt: '2026-03-01T00:00:00.000Z' }),
  ]
  expect(ids(latestPosts(dated, 'may'))).toEqual(['april', 'march', 'february'])

  // Two posts in total: only the other one.
  expect(ids(latestPosts(posts.slice(0, 2), posts[0].id))).toEqual([posts[1].id])
})
