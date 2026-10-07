import { expect, it } from 'vitest'
import rawPosts from '../test/fixtures/posts.json'
import { ApiShapeError, parsePosts } from './parsePosts'

function without(item: object, key: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...item }
  delete copy[key]
  return copy
}

it('D11 throws ApiShapeError when the response is an object, an HTML string or null', () => {
  expect(() => parsePosts({})).toThrow(ApiShapeError)
  expect(() =>
    parsePosts('<!doctype html><html><body>Service unavailable</body></html>'),
  ).toThrow(ApiShapeError)
  expect(() => parsePosts(null)).toThrow(ApiShapeError)
})

it('D12 drops an item without id, without title and with a null author, and passes the valid ones with their apiIndex', () => {
  const raw = [
    rawPosts[0], // position 0: valid
    without(rawPosts[4], 'id'), // 1: no id
    rawPosts[1], // 2: valid
    without(rawPosts[5], 'title'), // 3: no title
    rawPosts[2], // 4: valid
    { ...rawPosts[6], author: null }, // 5: author null
    rawPosts[3], // 6: valid
  ]

  const parsed = parsePosts(raw)

  expect(parsed.map((post) => post.id)).toEqual([
    rawPosts[0].id,
    rawPosts[1].id,
    rawPosts[2].id,
    rawPosts[3].id,
  ])
  // apiIndex is the position in the response, so the dropped items leave gaps.
  expect(parsed.map((post) => post.apiIndex)).toEqual([0, 2, 4, 6])
  expect(parsed[0]).toMatchObject({
    id: rawPosts[0].id,
    title: rawPosts[0].title,
    content: rawPosts[0].content,
    thumbnailUrl: rawPosts[0].thumbnail_url,
    createdAt: rawPosts[0].createdAt,
    author: {
      id: rawPosts[0].author.id,
      name: rawPosts[0].author.name,
      profilePicture: rawPosts[0].author.profilePicture,
    },
    categories: [
      { id: rawPosts[0].categories[0].id, name: rawPosts[0].categories[0].name },
    ],
    apiIndex: 0,
  })
})
