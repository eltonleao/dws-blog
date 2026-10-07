import { expect, it } from 'vitest'
import { parsePosts } from '../../api/parsePosts'
import rawPosts from '../../test/fixtures/posts.json'
import { makePost } from '../../test/makePost'
import { sortPosts } from './sortPosts'
import type { Post } from './types'

const ids = (posts: Post[]) => posts.map((post) => post.id)

it('D1 keeps the API order for newest and inverts it for oldest when every date is equal', () => {
  const apiIds = rawPosts.map((post) => post.id)
  const posts = parsePosts(rawPosts)

  expect(ids(sortPosts(posts, 'newest'))).toEqual(apiIds)
  expect(ids(sortPosts(posts, 'oldest'))).toEqual([...apiIds].reverse())
})

it('D2 sorts three distinct dates newest-first or oldest-first and leaves the input untouched', () => {
  const input = [
    makePost({ id: 'march', apiIndex: 0, createdAt: '2026-03-10T00:00:00.000Z' }),
    makePost({ id: 'may', apiIndex: 1, createdAt: '2026-05-20T00:00:00.000Z' }),
    makePost({ id: 'january', apiIndex: 2, createdAt: '2026-01-05T00:00:00.000Z' }),
  ]
  const inputBefore = ids(input)

  expect(ids(sortPosts(input, 'newest'))).toEqual(['may', 'march', 'january'])
  expect(ids(sortPosts(input, 'oldest'))).toEqual(['january', 'march', 'may'])
  expect(ids(input)).toEqual(inputBefore)
})

it('D3 sends an invalid and a missing date to the end in both orders without throwing', () => {
  const missing: Partial<Post> = makePost({ id: 'missing', apiIndex: 4 })
  delete missing.createdAt
  const posts = [
    makePost({ id: 'invalid', apiIndex: 0, createdAt: 'x' }),
    makePost({ id: 'may-first', apiIndex: 1, createdAt: '2026-05-01T00:00:00.000Z' }),
    makePost({ id: 'may-second', apiIndex: 2, createdAt: '2026-05-01T00:00:00.000Z' }),
    makePost({ id: 'march', apiIndex: 3, createdAt: '2026-03-01T00:00:00.000Z' }),
    missing as Post,
  ]

  expect(() => sortPosts(posts, 'newest')).not.toThrow()
  expect(() => sortPosts(posts, 'oldest')).not.toThrow()

  const newest = ids(sortPosts(posts, 'newest'))
  const oldest = ids(sortPosts(posts, 'oldest'))

  // The valid dates still follow D1 and D2: a tie keeps the API order for
  // newest and inverts it for oldest.
  expect(newest.slice(0, 3)).toEqual(['may-first', 'may-second', 'march'])
  expect(oldest.slice(0, 3)).toEqual(['march', 'may-second', 'may-first'])
  // The two broken ones come last, whatever the order.
  expect(newest.slice(3).sort()).toEqual(['invalid', 'missing'])
  expect(oldest.slice(3).sort()).toEqual(['invalid', 'missing'])
})
