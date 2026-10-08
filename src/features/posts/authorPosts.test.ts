import { expect, it } from 'vitest'
import { parsePosts } from '../../api/parsePosts'
import rawPosts from '../../test/fixtures/posts.json'
import { authorPosts } from './authorPosts'

const posts = parsePosts(rawPosts)

it('A1 authorPosts keeps only the posts of the author, in the order they came', () => {
  const author = posts[0].author.id
  const expected = posts.filter((post) => post.author.id === author)
  expect(expected.length, 'the snapshot has several posts by this author').toBeGreaterThan(1)
  expect(authorPosts(posts, author).map((post) => post.id)).toEqual(expected.map((post) => post.id))
})

it('A1 authorPosts answers an empty list for an id that no post has and for no posts at all', () => {
  expect(authorPosts(posts, 'no-such-author')).toEqual([])
  expect(authorPosts([], posts[0].author.id)).toEqual([])
})
